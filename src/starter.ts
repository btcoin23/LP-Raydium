import assert from 'assert';
import { Percent, TokenAmount } from '@raydium-io/raydium-sdk';
import { connection, pairUrl, wallet } from '../config';
import { getWalletTokenAccount } from './util';
import readline from 'readline/promises';
import { ammAddLiquidity } from './ammAddLiquidity';
import { ammRemoveLiquidity } from './ammRemoveLiquidity';
import Decimal from 'decimal.js';

async function startBot() {

  console.log('\n------------------------------------------------------------------\n\nStart running...');
  let targetPool: string;
  if(IsAMM){
    targetPool = AmmID;
  }else{
    console.log('Getting pool information...');
    const res = await fetch(pairUrl);
    assert(res.status === 200, "Cannot find the target pool");
    const data = await res.json();
    targetPool = data.find((obj: any) => obj.market === MarketID).ammId;
    console.log(`AMM ID is ${targetPool}`);
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
  }).then(({ txids, lpToken, liquidity }) => {
    console.log(`## Adding Liquidity Transaction: https://solscan.io/tx/${txids}`);
    console.log('\n------------------------------------------------------------------\n');
    let elapsedTime = DelayTime * 1000 * 60;

    const timer = setInterval(async() => {
      // Check if the elapsed time is greater than zero
      if (elapsedTime > 0) {
        // Convert elapsed time to hours, minutes, and seconds
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);

        // Format the time string
        let timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        process.stdout.write(`\rLeft time: ${timeString}`);
      } else {
        process.stdout.write(`\rTime is up!\n`);
        clearInterval(timer);
        // Call another function here
        const walletTokenInfs = await getWalletTokenAccount(connection, wallet.publicKey);
        const acc = walletTokenInfs.find(account => account.accountInfo.mint.toString() === lpToken.mint.toString());
        const bal = acc? acc.accountInfo.amount : liquidity;
        const lpTokenAmount = new TokenAmount(lpToken, bal);

        console.log('will remove liquidity info', {
          liquidity: lpToken.mint.toString(),
          liquidityD: new Decimal(bal.toString()).div(10 ** lpToken.decimals),
        })

        ammRemoveLiquidity({
          removeLpTokenAmount:lpTokenAmount,
          targetPool,
          walletTokenAccounts,
          wallet: wallet,
        }).then(({txids}) => {
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
  console.log('\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n')
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
  // const targetPool = '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX'
  // const marketid = '2AdaV97p6SfkuMQJdu8DHhBhmJe7oWdvbm52MJfYQmfA'
initBot();

// async function testFun() {
//   const lpToken = new Token(TOKEN_PROGRAM_ID, new PublicKey('Epm4KfTj4DMrvqn6Bwg2Tr2N8vhQuNbuK8bESFp4k33K'), 9);
//   const walletTokenInfs = await getWalletTokenAccount(connection, wallet.publicKey);
//   const acc = walletTokenInfs.find(account => account.accountInfo.mint.toString() === lpToken.mint.toString());
//   console.log(acc?.accountInfo.amount);
//   walletTokenInfs.map(account => console.log(account.accountInfo.mint +', '+ account.accountInfo.amount.toString()))
// }

// testFun();