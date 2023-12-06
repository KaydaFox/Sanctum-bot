import http from 'http';
import url from 'url';
import path, { extname } from 'path';
import { readFile } from 'fs/promises';
import { container } from '@sapphire/framework';

export default function initializeTicketAttachmentServer() {
	container.logger.info('Starting ticket attachtment server');

	try {
		const server = http.createServer(async (req, res) => {
			const parsedUrl = url.parse(req.url!, true);

			if (!parsedUrl || !parsedUrl.pathname) {
				res.writeHead(500);
				return res.end({ message: 'Pathname must be provided' });
			}

			const parts = parsedUrl.pathname?.split('/').filter(Boolean);

			if (parts && parts.length === 2) {
				const [messageId, attachmentName] = parts;
				try {
					const filePath = path.join('./ticketAttachmentStorage', messageId, attachmentName);
					const file = await readFile(filePath);
					const fileExtension = extname(attachmentName);
					const mimeType = MimeTypes[fileExtension as keyof typeof MimeTypes] ?? 'application/octet-stream';

					res.setHeader('Content-Type', mimeType);
					res.writeHead(200);
					return res.end(file);
				} catch (error) {
					container.logger.error(error);
					res.writeHead(404);
					return res.end('File not found');
				}
			} else {
				res.writeHead(404);
				return res.end('Invalid URL');
			}
		});

		server.listen(3000, () => {
			container.logger.info('Ticket attachment server started on port 3000');
		});
	} catch (error) {
		container.logger.error('Ticket attachment server failed to start\n', error);
		process.exit(1);
	}
}

enum MimeTypes {
	'.json' = 'application/json',
	'.opus' = 'audio/opus',
	'.gif' = 'image/gif',
	'.jpeg' = 'image/jpeg',
	'.png' = 'image/png',
	'.webp' = 'image/webp',
	'.txt' = 'text/plain',
	'.html' = 'text/html',
	'.mp4' = 'video/mp4',
	'mp' = 'video/mpeg',
	'.ogg' = 'video/ogg',
	'.webm' = 'video/webm'
}
