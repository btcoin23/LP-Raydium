import assert from 'assert';
import { MARKET_STATE_LAYOUT_V3, SPL_MINT_LAYOUT, Token, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk';
import { connection, wallet } from '../config';
import { getWalletTokenAccount } from './util';
import readline from 'readline/promises';
import { ammCreatePool, calcMarketStartPrice, getMarketAssociatedPoolKeys } from './ammCreatePool';
import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

const ZERO = new BN(0)
type BN = typeof ZERO

async function startBot() {

  console.log('\n------------------------------------------------------------------\n\nStart running...');

  const marketBufferInfo = await connection.getAccountInfo(new PublicKey(MarketID))
  assert(marketBufferInfo?.data, `can't find market ${MarketID}`)
  const { baseMint, quoteMint, baseLotSize, quoteLotSize } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data)

  console.log('Base Token Address-->', baseMint.toString())
  console.log('Quote Token Address-->', quoteMint.toString())

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
  const addBaseAmount = new BN(BaseAmount * (10 ** baseMintInfo.decimals))
  const addQuoteAmount = new BN(QuoteAmount * (10 ** quoteMintInfo.decimals))
  //const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // start from 7 days later
  const startTime = Math.floor(Date.now() / 1000) + 60 * 1 // start from 1 min later
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  /* do something with start price if needed */
  const startPrice = calcMarketStartPrice({ addBaseAmount, addQuoteAmount })
  console.log('StartPrice-->', startPrice.toString())

  /* do something with market associated pool keys if needed */
  const associatedPoolKeys = getMarketAssociatedPoolKeys({
    baseToken,
    quoteToken,
    targetMarketId,
  })

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
    //checkMarketId(MarketID);
    inputBaseAmount();
  } else {
    console.log("Not correct Open Book Market ID. Try again!")
    inputMarketID();
  }
}

inputMarketID()

// async function initBot() {
//   console.log('\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n')
//   let answer = await rl.question('You can insert AMM ID or Open Book Market ID. \n - Will you input AMM ID? Y/N? ', { signal } );
//   if(answer === 'y'){
//     inputAMMID();
//   }else if(answer === 'n'){
//     inputMarketID();
//   }
//   else {
//     initBot();
//   }
// }
// const targetPool = '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX'
// const marketid = '2AdaV97p6SfkuMQJdu8DHhBhmJe7oWdvbm52MJfYQmfA'
//initBot();

// async function testFun() {
//   // const lpToken = new Token(TOKEN_PROGRAM_ID, new PublicKey('Epm4KfTj4DMrvqn6Bwg2Tr2N8vhQuNbuK8bESFp4k33K'), 9);
//   // const walletTokenInfs = await getWalletTokenAccount(connection, wallet.publicKey);
//   // const acc = walletTokenInfs.find(account => account.accountInfo.mint.toString() === lpToken.mint.toString());
//   // console.log(acc?.accountInfo.amount);
//   // walletTokenInfs.map(account => console.log(account.accountInfo.mint +', '+ account.accountInfo.amount.toString()))
//   const wallet = base58.encode([145,7,233,59,243,41,209,204,3,107,230,93,93,168,138,2,135,193,172,150,79,55,118,92,137,125,211,252,130,41,241,126,37,185,241,183,225,23,7,3,39,110,146,215,125,72,173,117,228,108,12,33,237,144,228,174,235,48,85,79,150,69,90,13]) // insert your privatekey here
//   console.clear();
//   console.log(wallet);
// }

// testFun();