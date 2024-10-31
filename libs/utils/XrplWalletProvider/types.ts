import type {
	AccountLinesTrustline,
	AccountTxTransaction,
	BaseRequest,
	BaseResponse,
	Client,
	Transaction,
	Balance as XrplBalance,
} from "xrpl";

export interface GenericTransactionResponse {
	hash: string | undefined;
	status: "success" | string;
}

export interface InteractiveTransactionResponse {
	link: string | undefined;
	qrPng: string | undefined;
	hash: string | undefined;
	status: "success" | string;
}

export type ProviderName = "crossmark" | "xaman";

export interface IXrplWalletProvider {
	type: ProviderName;
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	getClient(): Client;
	getAccount(): string;
	request<TRequest extends BaseRequest, TResponse extends BaseResponse>(
		request: TRequest
	): Promise<TResponse>;
	getBalances(): Promise<XrplBalance[]>;
	getTrustlines(): Promise<AccountLinesTrustline[]>;
	getBridgeTransactions(): Promise<AccountTxTransaction[]>;
	createTrustline(): Promise<void>;
	signTransaction<TResponse>(
		tx: Transaction,
		callback: (response: TResponse) => void
	): Promise<void>;
}
