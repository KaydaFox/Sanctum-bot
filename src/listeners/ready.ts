import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Store } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { Time } from '@sapphire/duration';

const dev = process.env.NODE_ENV !== 'production';
import initializeTicketAttachmentServer from '#root/api/main';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public run() {
		this.printBanner();
		this.printStoreDebugInformation();
		initializeTicketAttachmentServer();

		setInterval(() => this.banRemover().catch((err) => this.container.logger.error(err)), Time.Minute * 5);
		// I'm aware that i could just put the Interval value myself, but since im using this package elsewhere, i may aswell do this to make it easier to read
	}

	private printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		console.log(
			String.raw`
${line01} ${pad}${blc('1.0.0')}
${line02} ${pad}[${success}] Gateway
${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: Store<any>, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}

	private async banRemover() {
		const guildData = this.container.client.guilds.cache.get(envParseString('GUILD_ID'));
		if (!guildData) return this.container.logger.error('Failed to fetch guild');

		const bans = await this.container.prisma.ban.findMany({
			where: {
				expiresAt: {
					lte: new Date()
				}
			}
		});

		// Only bans that are assigned an expiry time at creation are stored in the DB
		// So we don't need to check if there is no timeLength on the ban
		for (const ban of bans) {
			console.log(ban);
			setTimeout(async () => {
				await this.container.prisma.ban.delete({
					where: {
						id: ban.id
					}
				});

				await guildData.members.unban(String(ban.userId), 'Ban timer expired');
			}, Time.Hour); // We can just run this once an hour for now
		}
	}
}
