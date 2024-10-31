import type {
	AccountLinesTrustline,
	AccountTxTransaction,
	Balance,
	BaseRequest,
	BaseResponse,
	Transaction,
} from "xrpl";
import type { Xumm } from "xumm";

import { CrossmarkProvider } from "./CrossMarkProvider";
import type { IXrplWalletProvider, ProviderName } from "./types";
import { XummProvider } from "./XummProvider";

export * from "./types";

export class XrplWalletProvider implements IXrplWalletProvider {
	type: ProviderName = "xaman";
	private currentProvider: IXrplWalletProvider | undefined;

	detectProvider(provider?: Xumm): IXrplWalletProvider {
		if (!provider) {
			this.currentProvider = new CrossmarkProvider();
		} else {
			this.currentProvider = new XummProvider(provider);
		}

		return this.currentProvider;
	}

	checkProviderInitialized(): void {
		if (!this.currentProvider) {
			throw new Error("Provider is not initialized");
		}
	}

	async connect(): Promise<void> {
		this.checkProviderInitialized();

		await this.currentProvider!.connect();
	}

	async disconnect(): Promise<void> {
		this.checkProviderInitialized();

		await this.currentProvider!.disconnect();

		this.currentProvider = undefined;
	}

	getClient() {
		this.checkProviderInitialized();

		return this.currentProvider!.getClient();
	}

	getAccount(): string {
		this.checkProviderInitialized();

		const account = this.currentProvider!.getAccount();
		return account;
	}

	async getBalances(): Promise<Balance[]> {
		this.checkProviderInitialized();

		return await this.currentProvider!.getBalances();
	}

	async getTrustlines(): Promise<AccountLinesTrustline[]> {
		this.checkProviderInitialized();

		return await this.currentProvider!.getTrustlines();
	}

	async getBridgeTransactions(): Promise<AccountTxTransaction[]> {
		this.checkProviderInitialized();

		return await this.currentProvider!.getBridgeTransactions();
	}

	createTrustline(): Promise<void> {
		this.checkProviderInitialized();

		return this.currentProvider!.createTrustline();
	}

	async request<TRequest extends BaseRequest, TResponse extends BaseResponse>(
		request: TRequest
	): Promise<TResponse> {
		this.checkProviderInitialized();

		return await this.currentProvider!.request(request);
	}

	async signTransaction<TResposne>(
		tx: Transaction,
		callback: (response: TResposne) => void
	): Promise<void> {
		this.checkProviderInitialized();

		const autofilledTx = await this.currentProvider?.getClient().autofill(tx);
		return this.currentProvider!.signTransaction(autofilledTx!, callback as any);
	}
}
