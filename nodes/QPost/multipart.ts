/**
 * multipart/form-data encoded by hand, as one Buffer.
 *
 * QPost's /api/post takes a form upload. Building the bytes here, instead of
 * handing a FormData object to n8n's HTTP helper, means the request is the
 * same whatever HTTP client and FormData flavour the running n8n uses.
 */
export type MultipartFile = { field: string; name: string; type: string; data: Buffer };

export function encodeMultipart(
	fields: Record<string, string>,
	files: MultipartFile[],
): { body: Buffer; contentType: string } {
	const boundary = `----qpost${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
	const chunks: Buffer[] = [];
	const quote = (v: string) => v.replace(/["\r\n]/g, '_');
	for (const [name, value] of Object.entries(fields)) {
		chunks.push(
			Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${quote(name)}"\r\n\r\n${value}\r\n`, 'utf8'),
		);
	}
	for (const f of files) {
		chunks.push(
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="${quote(f.field)}"; filename="${quote(f.name)}"\r\n` +
					`Content-Type: ${f.type || 'application/octet-stream'}\r\n\r\n`,
				'utf8',
			),
			f.data,
			Buffer.from('\r\n', 'utf8'),
		);
	}
	chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
	return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}
