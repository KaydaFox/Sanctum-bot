import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { EmbedBuilder, type GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.GuildMemberAdd
})
export class GuildMemberAddListener extends Listener {
	public async run(member: GuildMember) {
		if (member.user.bot) return;

		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

			return threadChannel.send({
				embeds: [
					new EmbedBuilder()
						.setAuthor({
							name: member.user.username,
							iconURL: member.displayAvatarURL()
						})
						.setTitle(`Member joined`)
						.addFields(
							{
								name: 'Account Created',
								value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
							},
							{
								name: 'Member Joined',
								value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`
							},
							{
								name: 'Member Count',
								value: member.guild.memberCount.toString()
							}
						)
				]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
