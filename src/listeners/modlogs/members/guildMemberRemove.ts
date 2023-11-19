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

		console.log('waiting 5 seconds');

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

			switch (leaveType) {
				case 'standard':
					return this.handleLeave(member);
				case 'kick':
					return this.handleKick(member, latestAuditLogKickEntry.entries.first()!);
				case 'ban':
					return this.handleBan(member, latestAuditLogBanEntry.entries.first()!);
			}
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleLeave(member: GuildMember) {
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
						}
					)
			]
		});
	}

	private async handleKick(member: GuildMember, data: GuildAuditLogsEntry) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		console.log(data);

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
				}
			);

		return threadChannel.send({ embeds: [memberKickEmbed] });
	}

	private async handleBan(member: GuildMember, data: GuildAuditLogsEntry) {
		const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

		console.log(data);

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
				}
			);

		return threadChannel.send({ embeds: [memberBanEmbed] });
	}
}
