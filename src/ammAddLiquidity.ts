import assert from 'assert';

import {
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
  makeTxVersion
} from '../config';
import { formatAmmKeysById } from './formatAmmKeysById';
import {
  buildAndSendTx,
  getWalletTokenAccount,
} from './util';
import BN from 'bn.js';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  targetPool: string
  inputTokenAmount: number
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}

export async function ammAddLiquidity(
  input: TestTxInputInfo
): Promise<{ txids: string[]; lpToken: Token; liquidity: BN }> {
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  assert(targetPoolInfo, 'cannot find the target pool')

  
  
  const baseToken = new Token(TOKEN_PROGRAM_ID, targetPoolInfo.baseMint, targetPoolInfo.baseDecimals)
  const quoteToken = new Token(TOKEN_PROGRAM_ID, targetPoolInfo.quoteMint, targetPoolInfo.quoteDecimals)
  const lpToken = new Token(TOKEN_PROGRAM_ID, targetPoolInfo.lpMint, targetPoolInfo.lpDecimals);
  const baseAmount: BigNumberish = input.inputTokenAmount * (10 ** targetPoolInfo.baseDecimals);
  const baseTokenAmount = new TokenAmount(baseToken, baseAmount);
  // -------- step 1: compute another amount --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
  const { maxAnotherAmount, liquidity } = Liquidity.computeAnotherAmount({
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

  return { txids: await buildAndSendTx(addLiquidityInstructionResponse.innerTransactions), lpToken, liquidity }
}