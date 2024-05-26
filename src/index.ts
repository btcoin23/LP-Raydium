import assert from 'assert';
import { MARKET_STATE_LAYOUT_V3, SPL_MINT_LAYOUT, Token, TokenAmount, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk';
import { connection, wallet } from './config';
import { getWalletTokenAccount } from './util';
import readline from 'readline/promises';
import { ammCreatePool, calcMarketStartPrice, getMarketAssociatedPoolKeys } from './ammCreatePool';
import { ammRemoveLiquidity } from './ammRemoveLiquidity';
import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { BN } from 'bn.js';

const ZERO = new BN(1000_000_000_000)
type BN = typeof ZERO

async function startBot() {

  console.log('\n------------------------------------------------------------------\n\nStart running...');

  const marketBufferInfo = await connection.getAccountInfo(new PublicKey(MarketID))
  assert(marketBufferInfo?.data, `Can't find market ${MarketID}`)
  const { baseMint, quoteMint, baseLotSize, quoteLotSize } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data)

  console.log(' - Base Token Address: ', baseMint.toString())
  console.log(' - Quote Token Address: ', quoteMint.toString())

  const baseTokenInfo = await connection.getAccountInfo(baseMint)
  assert(baseTokenInfo?.data, `Can't find base token ${baseMint.toString()}`)
  const baseMintInfo = SPL_MINT_LAYOUT.decode(baseTokenInfo.data)

  const quoteTokenInfo = await connection.getAccountInfo(quoteMint)
  assert(quoteTokenInfo?.data, `Can't find quote token ${quoteMint.toString()}`)
  const quoteMintInfo = SPL_MINT_LAYOUT.decode(quoteTokenInfo.data)

  assert(!baseLotSize.isZero(), 'Base lot size is zero')
  assert(!quoteLotSize.isZero(), 'Quote lot size is zero')

  const baseToken = new Token(TOKEN_PROGRAM_ID, baseMint, baseMintInfo.decimals)
  const quoteToken = new Token(TOKEN_PROGRAM_ID, quoteMint, quoteMintInfo.decimals)
  const targetMarketId = new PublicKey(MarketID)
  const amount1 = BaseAmount * (10 ** baseMintInfo.decimals)
  const amount2 = QuoteAmount * (10 ** quoteMintInfo.decimals)
  const addBaseAmount = new BN(amount1.toString(), 10)
  const addQuoteAmount = new BN(amount2.toString(), 10)
  //const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // start from 7 days later
  const startTime = Math.floor(Date.now() / 1000) + 60 * 1 // start from 1 min later
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  /* do something with start price if needed */
  // const startPrice = calcMarketStartPrice({ addBaseAmount, addQuoteAmount })
  console.log(' - StartPrice: ', (QuoteAmount / BaseAmount).toString())

  /* do something with market associated pool keys if needed */
  const associatedPoolKeys = getMarketAssociatedPoolKeys({
    baseToken,
    quoteToken,
    targetMarketId,
  })

  const lpToken = new Token(TOKEN_PROGRAM_ID, associatedPoolKeys.lpMint, associatedPoolKeys.lpDecimals);
  const targetPool = associatedPoolKeys.id.toString();
  console.log(` - New LP token: ${associatedPoolKeys.lpMint} (Decimal: ${associatedPoolKeys.lpDecimals}, AMM Id: ${associatedPoolKeys.id})`)

  ammCreatePool({
    startTime,
    addBaseAmount,
    addQuoteAmount,
    baseToken,
    quoteToken,
    targetMarketId,
    wallet,
    walletTokenAccounts,
  }).then(({ txids }) => {
    /** continue with txids */
    console.log(`## Creating and initializing new pool: transaction: https://solscan.io/tx/${txids}`);
    console.log('\n------------------------------------------------------------------\n');

    let elapsedTime = DelayTime * 1000 * 60;

    const timer = setInterval(async () => {
      // Check if the elapsed time is greater than zero
      if (elapsedTime > 0) {
        // Convert elapsed time to hours, minutes, and seconds
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        // Format the time string
        let timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        process.stdout.write(`\r - Left time: ${timeString}`);
      } else {
        process.stdout.write(`\rTime is up!\n`);
        clearInterval(timer);
        // Call another function here
        const walletTokenInfs = await getWalletTokenAccount(connection, wallet.publicKey);
        const acc = walletTokenInfs.find(account => account.accountInfo.mint.toString() === lpToken.mint.toString());
        assert(acc, "Can't find LP token balance");
        const bal = acc.accountInfo.amount;
        const lpTokenAmount = new TokenAmount(lpToken, bal);

        console.log('Will remove liquidity info', {
          liquidity: lpToken.mint.toString(),
          liquidityD: new Decimal(bal.toString()).div(10 ** lpToken.decimals),
        })

        ammRemoveLiquidity({
          removeLpTokenAmount: lpTokenAmount,
          targetPool,
          walletTokenAccounts,
          wallet: wallet,
        }).then(({ txids }) => {
          console.log(`## Removing Liquidity Transaction: https://solscan.io/tx/${txids}`);
        })

      }
      elapsedTime -= 1000;
    }, 1000);
  })
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ac = new AbortController();
const signal = ac.signal;


let MarketID: string;
let BaseAmount: number;
let QuoteAmount: number;
let DelayTime: number

async function inputDelayTime() {
  const answer = await rl.question(' - Delay Time(min): ', { signal });
  if (!isNaN(Number(answer))) {
    DelayTime = Number(answer);
    startBot();
  } else {
    console.log("Plz insert correct number. Try again!")
    inputDelayTime();
  }
}

async function inputBaseAmount() {
  const answer = await rl.question(' - Base Token Amount: ', { signal });
  if (!isNaN(Number(answer))) {
    BaseAmount = Number(answer);
    inputQuoteAmount();
  } else {
    console.log("Plz insert correct number. Try again!")
    inputBaseAmount();
  }
}

async function inputQuoteAmount() {
  const answer = await rl.question(' - Quote Token Amount: ', { signal });
  if (!isNaN(Number(answer))) {
    QuoteAmount = Number(answer);
    inputDelayTime();
  } else {
    console.log("Plz insert correct number. Try again!")
    inputQuoteAmount();
  }
}

async function inputMarketID() {
  console.log('\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n')
  const answer = await rl.question(' - Open Book Market ID: ', { signal });
  if (answer.toString().length === 44) {
    MarketID = answer;
    inputBaseAmount();
  } else {
    console.log("Not correct Open Book Market ID. Try again!")
    inputMarketID();
  }
}

inputMarketID()
