import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { EmbedBuilder, type GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: 'guildTimeoutRemove'
})
export class GuildTimeoutRemoveListener extends Listener {
	public async run(member: GuildMember) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

			return threadChannel.send({
				embeds: [
					new EmbedBuilder()
						.setAuthor({
							name: member.user.username,
							iconURL: member.user.displayAvatarURL()
						})
						.setTitle(`Timeout expired or removed`)
				]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
