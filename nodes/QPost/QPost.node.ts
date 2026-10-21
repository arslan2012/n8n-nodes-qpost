import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { encodeMultipart, type MultipartFile } from './multipart';

/**
 * Publish video and image posts to TikTok, Instagram and YouTube through
 * QPost (https://qpost.dev). QPost holds the platform approvals (it is
 * audited for TikTok's Content Posting API), hosts the media and refreshes
 * tokens, so a workflow only needs an API key.
 */
export class QPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QPost',
		name: 'qPost',
		icon: 'file:qpost.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Publish videos and images to TikTok, Instagram and YouTube',
		defaults: { name: 'QPost' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'qPostApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Post', value: 'post' },
				],
				default: 'post',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['post'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create or schedule a post', description: 'Publish now, schedule, or save a draft' },
					{ name: 'Delete', value: 'delete', action: 'Delete a post', description: 'Remove the post from QPost (published videos stay live)' },
					{ name: 'Get', value: 'get', action: 'Get a post', description: 'Get a post with its per-platform status and public URLs' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many posts' },
					{ name: 'Get Stats', value: 'stats', action: 'Get post stats', description: 'Views, likes, comments and shares per platform' },
					{ name: 'Retry', value: 'retry', action: 'Retry a post', description: 'Publish a draft, or retry platforms that failed' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [{ name: 'Get Many', value: 'getAll', action: 'Get connected accounts' }],
				default: 'getAll',
			},

			// ── post: create ──────────────────────────────────────────────
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				options: [
					{ name: 'TikTok', value: 'TIKTOK' },
					{ name: 'Instagram', value: 'INSTAGRAM' },
					{ name: 'YouTube', value: 'YOUTUBE' },
				],
				default: ['TIKTOK'],
				description: 'Connect these accounts first at https://qpost.dev/accounts',
			},
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				typeOptions: { rows: 3 },
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				default: '',
				description: 'Used by YouTube (the video title)',
			},
			{
				displayName: 'Media Source',
				name: 'mediaSource',
				type: 'options',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				options: [
					{ name: 'Binary Data From a Previous Node', value: 'binary' },
					{ name: 'URL', value: 'url' },
				],
				default: 'binary',
				description: 'Every platform needs a video or at least one image; text-only posts are rejected',
			},
			{
				displayName: 'Media Kind',
				name: 'mediaKind',
				type: 'options',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				options: [
					{ name: 'Images', value: 'images' },
					{ name: 'Video', value: 'video' },
				],
				default: 'video',
			},
			{
				displayName: 'Input Binary Field(s)',
				name: 'binaryPropertyName',
				type: 'string',
				displayOptions: { show: { resource: ['post'], operation: ['create'], mediaSource: ['binary'] } },
				default: 'data',
				description: 'Binary field holding the file. For several images, separate field names with commas.',
			},
			{
				displayName: 'Media URL(s)',
				name: 'mediaUrls',
				type: 'string',
				displayOptions: { show: { resource: ['post'], operation: ['create'], mediaSource: ['url'] } },
				default: '',
				placeholder: 'https://example.com/clip.mp4',
				description: 'Public URL of the file. QPost downloads and re-hosts it, so signed or expiring URLs work. For several images, separate with commas.',
			},
			{
				displayName: 'When',
				name: 'when',
				type: 'options',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				options: [
					{ name: 'Publish Now', value: 'now' },
					{ name: 'Save as Draft', value: 'draft' },
					{ name: 'Schedule', value: 'schedule' },
				],
				default: 'now',
			},
			{
				displayName: 'Scheduled For',
				name: 'scheduledFor',
				type: 'dateTime',
				displayOptions: { show: { resource: ['post'], operation: ['create'], when: ['schedule'] } },
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				default: {},
				options: [
					{
						displayName: 'AI-Generated (TikTok Label)',
						name: 'isAigc',
						type: 'boolean',
						default: false,
						description: 'Whether TikTok should show its AI-generated label. Turn on for generated video.',
					},
					{
						displayName: 'TikTok Commercial Disclosure',
						name: 'tiktokDisclosure',
						type: 'multiOptions',
						options: [
							{ name: 'Your Brand (Promotional Content)', value: 'YOUR_BRAND' },
							{ name: 'Branded Content (Paid Partnership)', value: 'BRANDED_CONTENT' },
						],
						default: [],
					},
					{
						displayName: 'TikTok Privacy',
						name: 'tiktokPrivacy',
						type: 'options',
						options: [
							{ name: 'Public', value: 'PUBLIC_TO_EVERYONE' },
							{ name: 'Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
							{ name: 'Followers', value: 'FOLLOWER_OF_CREATOR' },
							{ name: 'Only Me', value: 'SELF_ONLY' },
						],
						default: 'PUBLIC_TO_EVERYONE',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: 'UTC',
						description: 'IANA timezone for the schedule, e.g. Europe/Berlin',
					},
					{
						displayName: 'YouTube Category ID',
						name: 'youtubeCategoryId',
						type: 'string',
						default: '22',
						description: '22 is People & Blogs, 28 is Science & Technology',
					},
					{
						displayName: 'YouTube Privacy',
						name: 'youtubePrivacy',
						type: 'options',
						options: [
							{ name: 'Public', value: 'public' },
							{ name: 'Unlisted', value: 'unlisted' },
							{ name: 'Private', value: 'private' },
						],
						default: 'public',
					},
				],
			},

			// ── post: get / delete / stats / retry ────────────────────────
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['get', 'delete', 'stats', 'retry'] } },
				default: '',
			},

			// ── post: getAll ──────────────────────────────────────────────
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
				default: {},
				options: [
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Draft', value: 'DRAFT' },
							{ name: 'Failed', value: 'FAILED' },
							{ name: 'Posted', value: 'POSTED' },
							{ name: 'Scheduled', value: 'SCHEDULED' },
						],
						default: 'POSTED',
					},
					{
						displayName: 'Platform',
						name: 'platform',
						type: 'options',
						options: [
							{ name: 'Instagram', value: 'INSTAGRAM' },
							{ name: 'TikTok', value: 'TIKTOK' },
							{ name: 'YouTube', value: 'YOUTUBE' },
						],
						default: 'TIKTOK',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('qPostApi');
		const baseUrl = String(credentials.baseUrl || 'https://qpost.dev').replace(/\/+$/, '');

		const call = async (method: IHttpRequestMethods, path: string, body?: unknown, qs?: IDataObject) => {
			const options: IHttpRequestOptions = { method, url: `${baseUrl}${path}`, json: true, qs };
			if (body !== undefined) options.body = body as IDataObject;
			return (await this.helpers.httpRequestWithAuthentication.call(this, 'qPostApi', options)) as IDataObject;
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject;

				if (resource === 'account') {
					result = await call('GET', '/api/accounts');
				} else if (operation === 'create') {
					result = await createPost.call(this, i, baseUrl);
				} else if (operation === 'getAll') {
					const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
					result = await call('GET', '/api/post', undefined, filters);
				} else {
					const id = encodeURIComponent(this.getNodeParameter('postId', i) as string);
					if (operation === 'get') result = await call('GET', `/api/post/${id}`);
					else if (operation === 'delete') result = await call('DELETE', `/api/post/${id}`);
					else if (operation === 'stats') result = await call('GET', `/api/post/${id}/stats`);
					else result = await call('POST', `/api/post/${id}/retry`);
				}
				out.push({ json: result, pairedItem: i });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: i });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [out];
	}
}

async function createPost(this: IExecuteFunctions, i: number, baseUrl: string): Promise<IDataObject> {
	const platforms = this.getNodeParameter('platforms', i) as string[];
	const caption = this.getNodeParameter('caption', i) as string;
	const title = this.getNodeParameter('title', i, '') as string;
	const mediaSource = this.getNodeParameter('mediaSource', i) as string;
	const mediaKind = this.getNodeParameter('mediaKind', i) as string;
	const when = this.getNodeParameter('when', i) as string;
	const opt = this.getNodeParameter('options', i, {}) as IDataObject;

	if (!platforms.length) throw new NodeOperationError(this.getNode(), 'Pick at least one platform', { itemIndex: i });

	const metadata: Record<string, IDataObject> = {
		TIKTOK: {
			privacyLevel: opt.tiktokPrivacy ?? 'PUBLIC_TO_EVERYONE',
			allowComment: true,
			allowDuet: true,
			allowStitch: true,
			...((opt.tiktokDisclosure as string[] | undefined)?.length
				? { commercialContentEnabled: true, commercialContentSelections: opt.tiktokDisclosure }
				: {}),
			...(opt.isAigc ? { isAigc: true } : {}),
		},
		YOUTUBE: {
			privacyStatus: opt.youtubePrivacy ?? 'public',
			categoryId: opt.youtubeCategoryId ?? '22',
			selfDeclaredMadeForKids: false,
			...(title ? { title } : {}),
		},
		INSTAGRAM: {},
	};

	const fields: Record<string, string> = {
		caption,
		platforms: JSON.stringify(platforms.map((p) => ({ platform: p, metadata: metadata[p] }))),
	};
	if (title) fields.title = title;
	if (when === 'draft') fields.draft = 'true';
	if (when === 'schedule') {
		const at = this.getNodeParameter('scheduledFor', i) as string;
		if (!at) throw new NodeOperationError(this.getNode(), 'Set "Scheduled For"', { itemIndex: i });
		fields.scheduledFor = new Date(at).toISOString();
		fields.timezone = (opt.timezone as string) || 'UTC';
	}

	const field = mediaKind === 'video' ? 'video' : 'images';
	const files: { data: Buffer; name: string; type: string }[] = [];
	if (mediaSource === 'binary') {
		const names = (this.getNodeParameter('binaryPropertyName', i) as string).split(',').map((s) => s.trim()).filter(Boolean);
		for (const name of names) {
			const meta = this.helpers.assertBinaryData(i, name);
			const data = await this.helpers.getBinaryDataBuffer(i, name);
			files.push({ data, name: meta.fileName ?? `${name}.${mediaKind === 'video' ? 'mp4' : 'jpg'}`, type: meta.mimeType });
		}
	} else {
		const urls = (this.getNodeParameter('mediaUrls', i) as string).split(',').map((s) => s.trim()).filter(Boolean);
		for (const url of urls) {
			const res = (await this.helpers.httpRequest({ method: 'GET', url, encoding: 'arraybuffer', returnFullResponse: true })) as {
				body: ArrayBuffer;
				headers: IDataObject;
			};
			const name = new URL(url).pathname.split('/').pop() || (mediaKind === 'video' ? 'clip.mp4' : 'image.jpg');
			files.push({ data: Buffer.from(res.body), name, type: String(res.headers['content-type'] ?? '') });
		}
	}
	if (!files.length) {
		throw new NodeOperationError(
			this.getNode(),
			'No media: TikTok, Instagram and YouTube all need a video or at least one image',
			{ itemIndex: i },
		);
	}
	const parts: MultipartFile[] = (field === 'video' ? files.slice(0, 1) : files).map((f) => ({ field, ...f }));
	const { body, contentType } = encodeMultipart(fields, parts);

	return (await this.helpers.httpRequestWithAuthentication.call(this, 'qPostApi', {
		method: 'POST',
		url: `${baseUrl}/api/post`,
		headers: { 'Content-Type': contentType },
		body,
		json: false,
	}).then((r: unknown) => (typeof r === 'string' ? JSON.parse(r) : r))) as IDataObject;
}
