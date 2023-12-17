import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { sleep } from '@sapphire/utilities';
import { AuditLogEvent, EmbedBuilder, GuildAuditLogsEntry, type GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.GuildMemberRemove
})
export class GuildMemberRemoveListener extends Listener {
	public async run(member: GuildMember) {
		if (member.user.bot) return;

		await sleep(5000);
		// this 5 second sleep is to allow the audit logs to update.
		// It's easier to do it this way lol

		try {
			let leaveType: 'standard' | 'kick' | 'ban' = 'standard';

			const latestAuditLogKickEntry = await member.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberKick,
				limit: 1
			});

			const latestAuditLogBanEntry = await member.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberBanAdd,
				limit: 1
			});

			if (latestAuditLogKickEntry.entries.first()?.target?.id === member.id) leaveType = 'kick';
			if (latestAuditLogBanEntry.entries.first()?.target?.id === member.id) leaveType = 'ban';

			const inviteInfo = await this.fetchInviteFromDB(member.id).catch((err) => {
				console.log(err);
				return null;
			});

			const embed = new EmbedBuilder()
				.setAuthor({
					name: member.user.username,
					iconURL: member.displayAvatarURL()
				})
				.addFields(
					{
						name: 'Account Created',
						value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
					},
					{
						name: 'Member Left',
						value: `<t:${Math.floor((Date.now() - 5000) / 1000)}:R>`,
						inline: true
					},
					{
						name: 'Member Joined',
						value: member.joinedTimestamp
							? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
							: "Discord is being dumb and didn't tell me",
						inline: true
					},
					{
						name: 'Member Count',
						value: member.guild.memberCount.toString()
					},
					{
						name: 'Invite info',
						value: `Invite code: ${inviteInfo?.inviteCode || 'Unkown'} from ${
							(inviteInfo && inviteInfo?.inviterUserId === 'unknown') || !inviteInfo?.invitedUserId
								? 'Unknown'
								: `<@${inviteInfo?.inviterUserId}>`
						}`
					}
				);

			switch (leaveType) {
				case 'standard':
					return this.handleLeave(embed);
				case 'kick':
					return this.handleKick(latestAuditLogKickEntry.entries.first()!, embed);
				case 'ban':
					return this.handleBan(latestAuditLogBanEntry.entries.first()!, embed);
			}
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleLeave(embed: EmbedBuilder) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		embed.setTitle(`Member left`);

		return threadChannel.send({
			embeds: [embed]
		});
	}

	private async handleKick(data: GuildAuditLogsEntry, embed: EmbedBuilder) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		embed.setTitle(`Member kicked by ${data.executor?.username || 'Unknown moderator'}`).addFields({
			name: 'Reason',
			value: `${data.reason ?? 'No reason provided'}`
		});

		return threadChannel.send({ embeds: [embed] });
	}

	private async handleBan(data: GuildAuditLogsEntry, embed: EmbedBuilder) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		embed.setTitle(`Member banned by ${data.executor?.username || 'Unknown moderator'}`).addFields({
			name: 'Reason',
			value: `${data.reason ?? 'No reason provided'}`
		});

		return threadChannel.send({ embeds: [embed] });
	}

	private fetchInviteFromDB(userId: string) {
		return this.container.prisma.invite.findFirst({
			where: {
				invitedUserId: userId
			}
		});
		// May delete the invites from the DB in the future, but for now we can leave it be
	}
}
