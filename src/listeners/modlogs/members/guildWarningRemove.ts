import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { EmbedBuilder, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: 'guildWarnRemove'
})
export class GuildWarnRemoveListener extends Listener {
	public async run(moderator: User, userId: string, data: { id: number; reason: string | null; didSendDm: boolean }) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

			const warnedUser = await this.container.client.users.fetch(userId);

			return threadChannel.send({
				embeds: [
					new EmbedBuilder()
						.setAuthor({
							name: warnedUser.username,
							iconURL: warnedUser.displayAvatarURL()
						})
						.setTitle(`Member warning removed by ${moderator.username}`)
						.addFields(
							{
								name: 'Warning data',
								value: `Warning #${data.id} with reason: ${data.reason}` ?? 'No data provided'
							},
							{
								name: 'DM status',
								value: data.didSendDm ? 'Sent' : 'Unable to send'
							}
						)
				]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
