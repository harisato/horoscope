import { callApiMixin } from '../../mixins/callApi/call-api.mixin';
import { Get, Service } from '@ourparentcenter/moleculer-decorators-extended';
import { Config } from '../../common';
import { CONST_CHAR, URL_TYPE_CONSTANTS, VESTING_ACCOUNT_TYPE } from '../../common/constant';
import { Context } from 'moleculer';
import {
	AccountInfoRequest,
	MoleculerDBService,
	ResponseDto,
	ErrorCode,
	ErrorMessage,
} from '../../types';
import { Utils } from '../../utils/utils';
import { dbAccountInfoMixin } from '../../mixins/dbMixinMongoose';
const mongo = require('mongodb');

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
@Service({
	name: 'account-info',
	version: 1,
	/**
	 * Mixins
	 */
	mixins: [callApiMixin, dbAccountInfoMixin],
	/**
	 * Settings
	 */
})
export default class AccountInfoService extends MoleculerDBService<
	{
		rest: 'v1/account-info';
	},
	{}
> {
	/**
	 *  @swagger
	 *  /v1/account-info:
	 *    get:
	 *      tags:
	 *        - Account Info
	 *      summary: Get information of an address
	 *      description: Get information of an address
	 *      parameters:
	 *        - in: query
	 *          name: address
	 *          required: true
	 *          schema:
	 *            type: string
	 *          description: "Address of account"
	 *        - in: query
	 *          name: chainId
	 *          required: true
	 *          schema:
	 *            type: string
	 *            enum: ["aura-testnet","serenity-testnet-001","halo-testnet-001","theta-testnet-001","osmo-test-4","evmos_9000-4","euphoria-1","cosmoshub-4"]
	 *          description: "Chain Id of network need to query"
	 *      responses:
	 *        '200':
	 *          description: Register result
	 *        '422':
	 *          description: Missing parameters
	 *
	 */
	@Get('/', {
		name: 'getAccountInfo',
		/**
		 * Service guard services allowed to connect
		 */
		restricted: ['api'],
		params: {
			address: 'string',
			chainId: 'string',
		},
	})
	async getAccountInfoByAddress(ctx: Context<AccountInfoRequest>) {
		const paramDelegateRewards =
			Config.GET_PARAMS_DELEGATE_REWARDS + `/${ctx.params.address}/rewards`;
		const url = Utils.getUrlByChainIdAndType(ctx.params.chainId, URL_TYPE_CONSTANTS.LCD);

		let [accountInfo, accountRewards]
			: [any, any] = await Promise.all([
				this.adapter.findOne({
					address: ctx.params.address,
					'custom_info.chain_id': ctx.params.chainId,
				}),
				this.callApiFromDomain(url, paramDelegateRewards),
			]);

		if (accountInfo) {
			accountInfo.account_delegate_rewards = accountRewards;
			const data = accountInfo;
			const result: ResponseDto = {
				code: ErrorCode.SUCCESSFUL,
				message: ErrorMessage.SUCCESSFUL,
				data,
			};
			return result;
		} else {
			this.broker.call('v1.handleAddress.accountinfoupsert', {
				listTx: [{ address: ctx.params.address, message: '' }],
				source: CONST_CHAR.API,
				chainId: ctx.params.chainId,
			});
			if (!accountRewards.code) {
				const result: ResponseDto = {
					code: ErrorCode.SUCCESSFUL,
					message: ErrorMessage.CRAWL_SUCCESSFUL,
					data: null,
				};
				return result;
			} else {
				const result: ResponseDto = {
					code: ErrorCode.ADDRESS_NOT_FOUND,
					message: ErrorMessage.ADDRESS_NOT_FOUND,
					data: null,
				};
				return result;
			}
		}
	}

	/**
	 *  @swagger
	 *  /v1/account-info/delegations:
	 *    get:
	 *      tags:
	 *        - Account Info
	 *      summary: Get delegation information of an address
	 *      description: Get delegation information of an address
	 *      parameters:
	 *        - in: query
	 *          name: address
	 *          required: true
	 *          schema:
	 *            type: string
	 *          description: "Address of account"
	 *        - in: query
	 *          name: chainId
	 *          required: true
	 *          schema:
	 *            enum: ["aura-testnet","serenity-testnet-001","halo-testnet-001","theta-testnet-001","osmo-test-4","evmos_9000-4","euphoria-1","cosmoshub-4"]
	 *            type: string
	 *          description: "Chain Id of network need to query"
	 *      responses:
	 *        '200':
	 *          description: OK
	 *        '422':
	 *          description: Missing parameters
	 *
	 */
	@Get('/delegations', {
		name: 'getAccountDelegationInfo',
		/**
		 * Service guard services allowed to connect
		 */
		restricted: ['api'],
		params: {
			address: 'string',
			chainId: 'string',
		},
	})
	async getAccountDelegationInfoByAddress(ctx: Context<AccountInfoRequest>) {
		let client = await this.connectToDB();
        const db = client.db(Config.DB_GENERIC_DBNAME);
        let accountInfoCollection = await db.collection("account_info");

		const paramDelegateRewards =
			Config.GET_PARAMS_DELEGATE_REWARDS + `/${ctx.params.address}/rewards`;
		const url = Utils.getUrlByChainIdAndType(ctx.params.chainId, URL_TYPE_CONSTANTS.LCD);

		const [accountInfo, accountRewards]: [any, any] = await Promise.all([
			accountInfoCollection.findOne(
				{
					address: ctx.params.address,
					'custom_info.chain_id': ctx.params.chainId,
				},
				{
					projection: { address: 1, account_balances: 1, account_delegations: 1, custom_info: 1 }
				}
			),
			this.callApiFromDomain(url, paramDelegateRewards),
		]);
		if (accountInfo) {
			accountInfo.account_delegate_rewards = accountRewards;
			const data = accountInfo;
			const result: ResponseDto = {
				code: ErrorCode.SUCCESSFUL,
				message: ErrorMessage.SUCCESSFUL,
				data,
			};
			return result;
		} else {
			this.broker.call('v1.handleAddress.accountinfoupsert', {
				listTx: [{ address: ctx.params.address, message: '' }],
				source: CONST_CHAR.API,
				chainId: ctx.params.chainId,
			});
			if (!accountRewards.code) {
				const result: ResponseDto = {
					code: ErrorCode.SUCCESSFUL,
					message: ErrorMessage.CRAWL_SUCCESSFUL,
					data: null,
				};
				return result;
			} else {
				const result: ResponseDto = {
					code: ErrorCode.ADDRESS_NOT_FOUND,
					message: ErrorMessage.ADDRESS_NOT_FOUND,
					data: null,
				};
				return result;
			}
		}
	}

	async connectToDB() {
        const DB_URL = `mongodb://${Config.DB_GENERIC_USER}:${encodeURIComponent(Config.DB_GENERIC_PASSWORD)}@${Config.DB_GENERIC_HOST}:${Config.DB_GENERIC_PORT}/?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;

        let cacheClient = await mongo.MongoClient.connect(
            DB_URL,
        );
        return cacheClient;
    }
}
