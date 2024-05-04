import assert from 'assert';

import {
  // CurrencyAmount,
  // jsonInfo2PoolKeys,
  // Liquidity,
  // LiquidityPoolKeys,
  Percent,
  // Token,
  // TokenAmount,
  // TOKEN_PROGRAM_ID,
  // BigNumberish
} from '@raydium-io/raydium-sdk';
// import { Keypair } from '@solana/web3.js';

// import Decimal from 'decimal.js';
import {
  connection,
  // DEFAULT_TOKEN,
  // makeTxVersion,
  poolUrl,
  wallet
} from '../config';
// import { formatAmmKeysById } from './formatAmmKeysById';
import {
  // buildAndSendTx,
  getWalletTokenAccount,
} from './util';
import axios from 'axios';
import readline from 'readline/promises';
import { ammAddLiquidity } from './ammAddLiquidity';
import { ammRemoveLiquidity } from './ammRemoveLiquidity';

async function startBot() {
  // const targetPool = '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX'
  // const marketid = '2AdaV97p6SfkuMQJdu8DHhBhmJe7oWdvbm52MJfYQmfA'
  console.log('------------------------------------------------------------------\nStart running...');
  let targetPool: string;
  if(IsAMM){
    targetPool = AmmID;
  }else{
    console.log('Getting pool information...');
    const key = '';
    const res = await axios.get(`${poolUrl}/raydium-api/getpoolid/?id=${MarketID}&key=${key}`);
    assert(res.status === 200, "Cannot find the target pool");
    targetPool = res.data;
    console.log(targetPool);
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
  }).then(({ txids, anotherAmount, lpTokenAmount }) => {
    /** continue with txids */
    console.log(`# Adding Liquidity Transaction: https://solscan.io/tx/${txids}`);

    setTimeout(() => {
      ammRemoveLiquidity({
        removeLpTokenAmount:lpTokenAmount,
        targetPool,
        walletTokenAccounts,
        wallet: wallet,
      }).then(({txids}) => {
        console.log(`# Removing Liquidity Transaction: https://solscan.io/tx/${txids}`);
      })
    }, DelayTime * 60 * 1000);
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
let DelayTime: number

async function inputDelayTime() {
  const answer = await rl.question(' - Delay Time(min): ', { signal } );
  if(!isNaN(Number(answer))){
    DelayTime = Number(answer);
    startBot();
  }else{
    console.log("Plz insert correct number. Try again!")
    inputDelayTime();
  }
}

async function inputAmount() {
  const answer = await rl.question(' - Token Amount: ', { signal } );
  if(!isNaN(Number(answer))){
    Amount = Number(answer);
    inputDelayTime();
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
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
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