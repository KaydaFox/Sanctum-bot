import { Invite } from '@prisma/client';
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

			switch (leaveType) {
				case 'standard':
					return this.handleLeave(member, inviteInfo);
				case 'kick':
					return this.handleKick(member, latestAuditLogKickEntry.entries.first()!, inviteInfo);
				case 'ban':
					return this.handleBan(member, latestAuditLogBanEntry.entries.first()!, inviteInfo);
			}
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleLeave(member: GuildMember, invite: Invite | null) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		return threadChannel.send({
			embeds: [
				new EmbedBuilder()
					.setAuthor({
						name: member.user.username,
						iconURL: member.displayAvatarURL()
					})
					.setTitle(`Member left`)
					.addFields(
						{
							name: 'Account Created',
							value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
						},
						{
							name: 'Member Left',
							value: `<t:${Math.floor(Date.now() / 1000)}:R>`
						},
						{
							name: 'Member Count',
							value: member.guild.memberCount.toString()
						},
						{
							name: 'Invite info',
							value: `Invite code: ${invite?.inviteCode || 'Unkown'} from ${
								(invite && invite?.inviterUserId === 'unknown') || !invite?.invitedUserId ? 'Unknown' : `<@${invite?.inviterUserId}>`
							}`
						}
					)
			]
		});
	}

	private async handleKick(member: GuildMember, data: GuildAuditLogsEntry, invite: Invite | null) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		const memberKickEmbed = new EmbedBuilder()
			.setAuthor({
				name: member.user.username,
				iconURL: member.displayAvatarURL()
			})
			.setTitle(`Member kicked by ${data.executor?.username || 'Unknown moderator'}`)
			.addFields(
				{
					name: 'Account Created',
					value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
					inline: true
				},
				{
					name: 'Member Joined',
					value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,
					inline: true
				},
				{
					name: 'Member Count',
					value: member.guild.memberCount.toString(),
					inline: true
				},
				{
					name: 'Reason',
					value: `${data.reason ?? 'No reason provided'}`
				},
				{
					name: 'Invite info',
					value: `Invite code: ${invite?.inviteCode || 'Unkown'} from ${
						(invite && invite?.inviterUserId === 'unknown') || !invite?.invitedUserId ? 'Unknown' : `<@${invite?.inviterUserId}>`
					}`
				}
			);

		return threadChannel.send({ embeds: [memberKickEmbed] });
	}

	private async handleBan(member: GuildMember, data: GuildAuditLogsEntry, invite: Invite | null) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		const memberBanEmbed = new EmbedBuilder()
			.setAuthor({
				name: member.user.username,
				iconURL: member.displayAvatarURL()
			})
			.setTitle(`Member banned by ${data.executor?.username || 'Unknown moderator'}`)
			.addFields(
				{
					name: 'Account Created',
					value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
					inline: true
				},
				{
					name: 'Member Joined',
					value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,
					inline: true
				},
				{
					name: 'Member Count',
					value: member.guild.memberCount.toString(),
					inline: true
				},
				{
					name: 'Reason',
					value: `${data.reason ?? 'No reason provided'}`
				},
				{
					name: 'Invite info',
					value: `Invite code: ${invite?.inviteCode || 'Unkown'} from ${
						(invite && invite?.inviterUserId === 'unknown') || !invite?.invitedUserId ? 'Unknown' : `<@${invite?.inviterUserId}>`
					}`
				}
			);

		return threadChannel.send({ embeds: [memberBanEmbed] });
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
