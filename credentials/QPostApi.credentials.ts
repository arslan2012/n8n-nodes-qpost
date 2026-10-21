import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class QPostApi implements ICredentialType {
	name = 'qPostApi';

	displayName = 'QPost API';

	icon: Icon = 'file:../icons/qpost.svg';

	documentationUrl = 'https://qpost.dev/docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Create one at https://qpost.dev/api-keys',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://qpost.dev',
			description: 'Only change this for a self-hosted QPost',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/accounts',
			method: 'GET',
		},
	};
}
