import Sdk from "@crossmarkio/sdk";
import type {
	AccountInfoRequest,
	AccountInfoResponse,
	AccountLinesRequest,
	AccountLinesResponse,
	AccountLinesTrustline,
	AccountTxRequest,
	AccountTxResponse,
	AccountTxTransaction,
	Balance,
	BaseRequest,
	BaseResponse,
	Request,
	Transaction,
} from "xrpl";
import { Client, parseAccountRootFlags } from "xrpl";

import { IXrplWalletProvider, ProviderName } from "./types";
import { filterTransactions } from "./XummProvider";

interface MetaStatus {
	isError: boolean;
	isRejected: boolean;
	isExpired: boolean;
	isSigned: boolean;
	isPending: boolean;
	isSuccess: boolean;
	isFail: boolean;
	isVerified: boolean;
}

export class CrossmarkProvider implements IXrplWalletProvider {
	type: ProviderName = "crossmark";
	private provider = Sdk;
	private apiClient: Client | undefined;
	private account: string | undefined;
	private balances: Balance[] | undefined;

	constructor() {}

	getClient(): Client {
		if (!this.apiClient) {
			throw new Error("Client is not initialized");
		}
		return this.apiClient;
	}

	async connect(): Promise<void> {
		console.log("connect");

		const res = await this.provider.async.signInAndWait();

		this.account = res.response.data.address;
		this.apiClient = new Client(res.response.data.network.wss);
		await this.apiClient.connect();
	}

	async disconnect(): Promise<void> {
		await this.apiClient?.disconnect();
	}

	getAccount(): string {
		if (!this.account) {
			return this.provider.sync.getAddress() ?? "";
		}

		return this.account;
	}

	async getBalances(): Promise<Balance[]> {
		if (!this.apiClient) {
			throw new Error("Client is not initialized");
		}
		this.balances = await this.apiClient.getBalances(this.account!);
		return this.balances;
	}

	async getTrustlines(): Promise<AccountLinesTrustline[]> {
		const requestBody = {
			id: 1,
			command: "account_lines",
			account: this.account,
		} as AccountLinesRequest;

		const response = await this.request<AccountLinesRequest, AccountLinesResponse>(requestBody);
		console.log("fetch trustline response", response);

		return response?.result?.lines ?? [];
	}

	async requiresDestinationTag(account?: string): Promise<boolean> {
		const requestBody = {
			command: "account_info",
			account: account ?? this.account,
		} as AccountInfoRequest;

		const response = await this.request<AccountInfoRequest, AccountInfoResponse>(requestBody);
		console.log("fetch trustline response", response);

		const flags = parseAccountRootFlags(response.result.account_data.Flags);
		if (flags.lsfRequireDestTag) {
			return true;
		} else {
			return false;
		}
	}

	async getBridgeTransactions(): Promise<AccountTxTransaction[]> {
		const requestBody = {
			id: 2,
			command: "account_tx",
			account: this.account,
			ledger_index_min: -1,
			ledger_index_max: -1,
			binary: false,
			limit: 100,
			forward: false,
		} as AccountTxRequest;
		// await this.getClient().autofill(requestBody as unknown as Transaction)
		const response = await this.request<AccountTxRequest, AccountTxResponse>(requestBody);
		console.log("fetch bridge transaction response", response);

		return filterTransactions(response);
	}

	async createTrustline(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async request<TRequest extends BaseRequest, TResponse extends BaseResponse>(
		request: TRequest
	): Promise<TResponse> {
		if (!this.apiClient) {
			throw new Error("Client is not initialized");
		}

		const response = await this.apiClient.request(request as Request);
		return response as TResponse;
	}

	async signTransaction<GenericTransactionResponse>(
		tx: Transaction,
		callback: (response: GenericTransactionResponse) => void
	): Promise<void> {
		const result = await this.provider?.async.signAndSubmitAndWait(tx as any);

		callback({
			status: this.resolveStatusFromMeta(result?.response.data.meta),
			hash:
				result?.response.data.resp !== undefined
					? result?.response.data.resp.result.hash
					: undefined,
		} as GenericTransactionResponse);
	}

	resolveStatusFromMeta(meta: MetaStatus | undefined): string {
		if (!meta) return "unknown";

		if (meta.isPending) {
			return "pending";
		}
		if (meta.isSuccess) {
			return "success";
		}
		if (meta.isError) {
			return "error";
		}
		if (meta.isRejected) {
			return "rejected";
		}
		if (meta.isExpired) {
			return "expired";
		}
		return "unknown";
	}
}
