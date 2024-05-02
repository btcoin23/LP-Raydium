import assert from 'assert';

import {
  CurrencyAmount,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount
} from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';

import Decimal from 'decimal.js';
import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  wallet
} from '../config';
import { formatAmmKeysById } from './formatAmmKeysById';
import {
  buildAndSendTx,
  getWalletTokenAccount,
} from './util';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
  baseToken: Token
  quoteToken: Token
  targetPool: string
  inputTokenAmount: TokenAmount
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}

async function ammAddLiquidity(
  input: TestTxInputInfo
): Promise<{ txids: string[]; anotherAmount: TokenAmount | CurrencyAmount }> {
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  assert(targetPoolInfo, 'cannot find the target pool')

  // -------- step 1: compute another amount --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
  const { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
    poolKeys,
    poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
    amount: input.inputTokenAmount,
    anotherCurrency: input.quoteToken,
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
    amountInA: input.inputTokenAmount,
    amountInB: maxAnotherAmount,
    fixedSide: 'a',
    makeTxVersion,
  })

  return { txids: await buildAndSendTx(addLiquidityInstructionResponse.innerTransactions), anotherAmount }
}

async function howToUse() {
  const baseToken = DEFAULT_TOKEN.WSOL // 
  const quoteToken = DEFAULT_TOKEN.USDT // 
  const targetPool = '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX'
  const inputTokenAmount = new TokenAmount(baseToken, 10202403)
  const slippage = new Percent(50, 100)
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  ammAddLiquidity({
    baseToken,
    quoteToken,
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet,
  }).then(({ txids, anotherAmount }) => {
    /** continue with txids */
    console.log('txids', txids)
  })
}

howToUse();