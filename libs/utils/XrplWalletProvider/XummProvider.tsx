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
import { Client, dropsToXrp } from "xrpl";
import { Xumm } from "xumm";
import { ResolvedFlow } from "xumm-oauth2-pkce";

import { XRPL_BRIDGE_ADDRESS } from "@/libs/constants";

import { IXrplWalletProvider, ProviderName } from "./types";

export interface XummPayloadMeta {
	exists: boolean;
	uuid: string;
	multisign: boolean;
	submit: boolean;
	pathfinding: boolean;
	pathfinding_fallback: boolean;
	force_network?: string;
	destination: string;
	resolved_destination: string;
	resolved: boolean;
	signed: boolean;
	cancelled: boolean;
	expired: boolean;
	pushed: boolean;
	app_opened: boolean;
	opened_by_deeplink: boolean | null;
	immutable?: boolean;
	forceAccount?: boolean;
	return_url_app: string | null;
	return_url_web: string | null;
	is_xapp: boolean;
	signers: string[] | null;
}

export interface XummResponsePayload {
	payload: {
		meta: XummPayloadMeta | undefined;
		response:
			| {
					account: string | undefined;
					txid: string | undefined;
					signer: string | undefined;
					dispatched_to: string | undefined;
					dispatched_result: string | undefined;
			  }
			| undefined;
	};
}
export interface XummProviderOptions {
	apiKey: string | undefined;
}

export class XummProvider implements IXrplWalletProvider {
	type: ProviderName = "xaman";
	private provider: Xumm | undefined;
	private account: string | undefined;
	private network: string | undefined;
	private apiClient: Client | undefined;

	constructor(provider: Xumm) {
		this.provider = provider;
	}

	async connect(): Promise<void> {
		console.log("connect", this.provider);
		if (!this.provider) {
			throw new Error("Xumm provider is not initialized");
		}
		try {
			const result = (await this.provider?.authorize()) as ResolvedFlow & {
				me: { networkEndpoint: string };
			};
			if (result && result.me) {
				this.account = result.me.account;
				this.network = result.me.networkEndpoint;
				if (this.network) {
					this.apiClient = new Client(this.network);
					await this.apiClient.connect();
				}
			}
		} catch (e) {
			console.log("XummProvider connect error", e);
		}
	}

	private isInitialized(): boolean {
		return this.provider !== undefined || this.apiClient !== undefined;
	}

	getClient(): Client {
		this.checkInitialized();
		if (!this.apiClient) {
			throw new Error("Client is not initialized");
		}
		return this.apiClient;
	}

	checkInitialized(): void {
		if (!this.isInitialized()) {
			throw new Error("Xumm provider is not initialized");
		}
	}

	async disconnect(): Promise<void> {
		if (!this.provider) {
			throw new Error("Xumm provider is not initialized");
		}
		this.checkInitialized();
		await this.provider.logout();
		this.account = undefined;
		this.network = undefined;
		await this.apiClient?.disconnect();
		this.apiClient = undefined;
		if (typeof window !== "undefined") {
			window.localStorage.removeItem("XummPkceJwt");
			window.location.reload();
		}
	}

	getAccount(): string {
		this.checkInitialized();
		if (!this.account) {
			throw new Error("Account is not initialized");
		}
		return this.account;
	}

	async request<TRequest extends BaseRequest, TResponse extends BaseResponse>(
		request: TRequest
	): Promise<TResponse> {
		this.checkInitialized();
		if (!this.apiClient) {
			throw new Error("Client is not initialized");
		}

		const response = await this.apiClient.request(request as Request);
		return response as TResponse;
	}

	private async getAccountInfo(): Promise<AccountInfoResponse> {
		const getAccountInfoRequest: AccountInfoRequest = {
			command: "account_info",
			account: this.account!,
			restrict: true,
		};
		return await this.request(getAccountInfoRequest);
	}

	private async getAccountLines(): Promise<AccountLinesResponse> {
		const accountLines: AccountLinesRequest = {
			account: this.account!,
			command: "account_lines",
			ledger_index: "validated",
			strict: true,
		};
		return await this.request(accountLines);
	}

	async getBalances(): Promise<Balance[]> {
		if (!this.account) throw new Error("Account is not initialized");

		const accountLines = await this.getAccountLines();
		const balances = accountLines.result.lines.map((line) => ({
			currency: line.currency,
			value: line.balance,
			issuer: line.account,
		}));

		const accountInfo = await this.getAccountInfo();

		/*
		 * The base reserve is the minimum amount of XRP needed for an address on the XRP ledger.
		 * The size of the base reserve can be changed in a vote by XRP validators.
		 * In addition to the default 10 XRP minimum — the base reserve for each address
		 * there is also an owner reserve, which is 2 XRP for each object an address owns.
		 */
		const xrpBalance = {
			value: String(
				dropsToXrp(
					Number(accountInfo.result.account_data.Balance) -
						Number(10000000 + balances.length * 2000000)
				)
			),
			currency: "XRP",
		};

		return [xrpBalance, ...balances.filter((balance) => balance.currency !== "XRP")];
	}

	async getTrustlines(): Promise<AccountLinesTrustline[]> {
		const response = await this.getAccountLines();
		console.log("fetch trustline response", response);

		return response?.result?.lines ?? [];
	}

	async getBridgeTransactions(): Promise<AccountTxTransaction[]> {
		const requestBody: AccountTxRequest = {
			command: "account_tx",
			account: this.account!,
			ledger_index_min: -1,
			ledger_index_max: -1,
			binary: false,
			limit: 100,
			forward: false,
		} as AccountTxRequest;

		const response = await this.request<AccountTxRequest, AccountTxResponse>(requestBody);

		return filterTransactions(response);
	}

	async createTrustline(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async signTransaction<InteractiveTransactionResponse>(
		tx: Transaction,
		callback: (response: InteractiveTransactionResponse) => void
	): Promise<void> {
		const payload = await this.provider?.payload?.createAndSubscribe(
			{
				txjson: await this.getClient()!.autofill(tx as any),
			},
			(eventMessage) => {
				if (Object.keys(eventMessage.data).indexOf("opened") > -1) {
					// Update the UI? The payload was opened.
				}
				if (Object.keys(eventMessage.data).indexOf("signed") > -1) {
					// The `signed` property is present, true (signed) / false (rejected)
					console.log("payload signed", eventMessage);
					// eventMessage.resolve("is signed");
					return eventMessage;
				}
			}
		);
		if (!payload) throw new Error("Payload is not created");

		const { created, resolved } = payload;

		callback({
			link: created?.next.always,
			qrPng: created?.refs.qr_png,
			status: "pending",
		} as InteractiveTransactionResponse);

		const resolvedPayload = (await resolved) as any;

		console.log("resolvedPayload", resolvedPayload?.payload);
		callback({
			hash: resolvedPayload?.payload?.response?.txid,
			status: this.resolveStatusFromMeta(resolvedPayload?.payload?.meta),
		} as InteractiveTransactionResponse);
	}

	resolveStatusFromMeta(meta: XummPayloadMeta | undefined): string {
		if (!meta) return "unknown";

		if (meta.signed && meta.resolved) return "success";
		if (meta.pushed) return "pending";
		if (meta.cancelled) return "cancelled";
		if (meta.expired) return "expired";
		if (meta.pushed) return "pushed";
		if (meta.signed) return "signed";

		return "unknown";
	}
}
export const filterTransactions = (response: AccountTxResponse) => {
	const result =
		response?.result?.transactions?.filter(
			(tx: any) =>
				tx.tx?.Destination === XRPL_BRIDGE_ADDRESS &&
				tx.tx.TransactionType === "Payment" &&
				tx.tx.Memos
		) ?? [];

	return result;
};
