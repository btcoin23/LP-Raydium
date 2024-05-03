import assert from 'assert';

import {
  CurrencyAmount,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  BigNumberish
} from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';

import Decimal from 'decimal.js';
import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  poolUrl,
  wallet
} from '../config';
import { formatAmmKeysById } from './formatAmmKeysById';
import {
  buildAndSendTx,
  getWalletTokenAccount,
} from './util';
import axios from 'axios';
import readline from 'readline/promises';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  targetPool: string
  inputTokenAmount: number
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}

async function ammAddLiquidity(
  input: TestTxInputInfo
): Promise<{ txids: string[]; anotherAmount: TokenAmount | CurrencyAmount }> {
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  assert(targetPoolInfo, 'cannot find the target pool')

  
  const baseToken = new Token(TOKEN_PROGRAM_ID, targetPoolInfo.baseMint, targetPoolInfo.baseDecimals)
  const quoteToken = new Token(TOKEN_PROGRAM_ID, targetPoolInfo.quoteMint, targetPoolInfo.quoteDecimals)
  const baseAmount: BigNumberish = input.inputTokenAmount * (10 ** targetPoolInfo.baseDecimals);
  const baseTokenAmount = new TokenAmount(baseToken, baseAmount);
  // -------- step 1: compute another amount --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
  const { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
    poolKeys,
    poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
    amount: baseTokenAmount,
    anotherCurrency: quoteToken,
    slippage: input.slippage,
  })

  console.log('will add liquidity info', {
    liquidity: liquidity.toString(),
    liquidityD: new Decimal(liquidity.toString()).div(10 ** extraPoolInfo.lpDecimals),
  })

  // -------- step 2: make instructions --------
  const addLiquidityInstructionResponse = await Liquidity.makeAddLiquidityInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      owner: input.wallet.publicKey,
      payer: input.wallet.publicKey,
      tokenAccounts: input.walletTokenAccounts,
    },
    amountInA: baseTokenAmount,
    amountInB: maxAnotherAmount,
    fixedSide: 'a',
    makeTxVersion,
  })

  return { txids: await buildAndSendTx(addLiquidityInstructionResponse.innerTransactions), anotherAmount }
}

async function startBot() {
  // const targetPool = '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX'
  // const marketid = '2AdaV97p6SfkuMQJdu8DHhBhmJe7oWdvbm52MJfYQmfA'
  console.log('--------------------------------------------\nStart running...');
  let targetPool: string;
  if(IsAMM){
    targetPool = AmmID;
  }else{
    console.log('Getting pool information...');
    const { data: liquidityData } = await axios.get<{
      official: any[];
      unOfficial: any[];
    }>(poolUrl);
    const foundObject = liquidityData.official.find(obj => obj.marketId === MarketID);
    assert(foundObject, 'cannot find the target pool');
    targetPool = foundObject.id;
  }
  console.log('Sending transaction...');
  const inputTokenAmount:number = Amount;
  const slippage = new Percent(100, 100);
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey);

  ammAddLiquidity({
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet,
  }).then(({ txids, anotherAmount }) => {
    /** continue with txids */
    console.log(`---------- https://solscan.io/tx/${txids} ----------`);
  })
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ac = new AbortController();
const signal = ac.signal;

let AmmID: string;
let IsAMM: boolean;
let MarketID: string;
let Amount: number;

async function inputAmount() {
  const answer = await rl.question(' - Token Amount: ', { signal } );
  if(!isNaN(Number(answer))){
    Amount = Number(answer);
    startBot();
  }else{
    console.log("Plz insert correct number. Try again!")
    inputAmount();
  }
}

async function inputAMMID() {
  const answer = await rl.question(' - AMMID: ', { signal } );
  if(answer.toString().length === 44){
    AmmID = answer;
    IsAMM = true;
    inputAmount();
  }else{
    console.log("Not correct AMMID. Try again!")
    inputAMMID();
  }
}


async function inputMarketID() {
  const answer = await rl.question(' - Open Book Market ID: ', { signal } );
  if(answer.toString().length === 44){
    MarketID = answer;
    inputAmount();
  }else{
    console.log("Not correct Open Book Market ID. Try again!")
    inputMarketID();
  }
}

async function initBot() {
  // Ask the user for input
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
  let answer = await rl.question('You can insert AMM ID or Open Book Market ID. \n - Will you input AMM ID? Y/N? ', { signal } );
  if(answer === 'y'){
    inputAMMID();
  }else if(answer === 'n'){
    inputMarketID();
  }
  else {
    initBot();
  }
}

initBot();