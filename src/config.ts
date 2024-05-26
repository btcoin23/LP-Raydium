import {
  ENDPOINT as _ENDPOINT,
  Currency,
  LOOKUP_TABLE_CACHE,
  MAINNET_PROGRAM_ID,
  RAYDIUM_MAINNET,
  Token,
  TOKEN_PROGRAM_ID,
  TxVersion,
} from '@raydium-io/raydium-sdk';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import 'dotenv/config';
import base58 from "bs58"

const RPC_URL = process.env.RPC_URL;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
export const wallet = Keypair.fromSecretKey(Buffer.from(base58.decode(WALLET_PRIVATE_KEY)))
export const pairUrl = 'https://api.raydium.io/v2/main/pairs'
export const rpcToken: string | undefined = undefined
export const connection = new Connection(RPC_URL)//, {wsEndpoint: WSS_URL});
export const PROGRAMIDS = MAINNET_PROGRAM_ID;
export const ENDPOINT = _ENDPOINT;
export const RAYDIUM_MAINNET_API = RAYDIUM_MAINNET;
export const makeTxVersion = TxVersion.V0;
export const addLookupTableInfo = LOOKUP_TABLE_CACHE
export const DEFAULT_TOKEN = {
  'SOL': new Currency(9, 'USDC', 'USDC'),
  'WSOL': new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
  'USDT': new Token(TOKEN_PROGRAM_ID, new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), 6, 'USDT', 'USDT'),
  'USDC': new Token(TOKEN_PROGRAM_ID, new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
  'RAY': new Token(TOKEN_PROGRAM_ID, new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'), 6, 'RAY', 'RAY'),
  'Test1': new Token(TOKEN_PROGRAM_ID, new PublicKey('G4PwpR5ZcGwJiufVwADSvgPFiYi3JY1mZLXCebfJxegt'), 9, 'Test1', 'Test1'),
  'Test2': new Token(TOKEN_PROGRAM_ID, new PublicKey('2ga6K9MSqEMivvP3kyeNoo16y281yLLmhuYdaFmGq5KC'), 9, 'Test2', 'Test2'),
  'RAY_USDC-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
  'SOL_USDT-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey('Epm4KfTj4DMrvqn6Bwg2Tr2N8vhQuNbuK8bESFp4k33K'), 6, 'SOL-USDT', 'SOL-USDT'),
}