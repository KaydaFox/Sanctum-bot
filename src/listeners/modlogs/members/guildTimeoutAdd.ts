import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { sleep } from '@sapphire/utilities';
import { AuditLogEvent, EmbedBuilder, type GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: 'guildTimeoutAdd'
})
export class GuildTimeoutAddListener extends Listener {
	public async run(member: GuildMember) {
		await sleep(5000);
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

			const auditLogEvent = await member.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberUpdate,
				limit: 1
			});

			let reason = 'No reason provided';
			let moderator = null;

			if (auditLogEvent.entries.first()?.targetId === member.id) {
				reason = auditLogEvent.entries.first()?.reason ?? 'No reason provided';
				moderator = auditLogEvent.entries.first()?.executor;
			}

			const didSendUserDm = await this.container.utilities.modlogUtilities.sendDmToUser(
				member.id,
				new EmbedBuilder()
					.setAuthor({
						name: member.guild.name,
						iconURL: member.guild.iconURL() ?? undefined
					})
					.setDescription(
						`You have been timed out in ${member.guild.name}\nThis will be removed <t:${Math.floor(
							member.communicationDisabledUntilTimestamp! / 1000
						)}:R>`
					)
					.addFields({
						name: 'Reason',
						value: reason ?? 'No reason provided'
					})
			);

			return threadChannel.send({
				embeds: [
					new EmbedBuilder()
						.setAuthor({
							name: member.user.username,
							iconURL: member.user.displayAvatarURL()
						})
						.setTitle(`Timeout added by ${moderator?.username ?? 'Unknown'}`)
						.addFields(
							{
								name: 'Reason',
								value: reason
							},
							{
								name: 'DM status',
								value: didSendUserDm ? 'Sent' : 'Unable to send',
								inline: true
							},
							{
								name: 'Expires',
								value: `<t:${Math.floor(member.communicationDisabledUntilTimestamp! / 1000)}:R>`,
								inline: true
							}
						)
				]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
