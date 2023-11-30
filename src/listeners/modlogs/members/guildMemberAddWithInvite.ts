import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { EmbedBuilder, type Invite, type GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	name: 'guildMemberAddWithInvite',
	once: false
})
export class GuildMemberAddListener extends Listener {
	public async run(member: GuildMember, inviteType: TrackerType, invite: Invite | null) {
		if (member.user.bot) return;

		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

			try {
				await this.container.prisma.invite.upsert({
					where: {
						invitedUserId: member.id
					},
					update: {
						inviteCode: invite?.code || 'Unknown',
						inviterUserId: invite?.inviter?.id || 'Unknown'
					},
					create: {
						inviteCode: invite?.code || 'Unknown',
						invitedUserId: member.id,
						inviterUserId: invite?.inviter?.id || 'Unknown'
					}
				});
			} catch (error) {
				this.container.logger.error('Error happened when saving an invite to the database');
				this.container.logger.error(error);
			}

			const memberJoinEmbed = new EmbedBuilder()
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
				);

			let inviteInfo: string = '';

			inviteInfo =
				inviteType === 'vanity'
					? 'Joined from servers vanity invite'
					: `Invite code: ${invite?.code || 'Unkown'} from ${invite?.inviter || 'Unknown'}`;

			memberJoinEmbed.addFields({
				name: 'Invite info',
				value: inviteInfo
			});

			return threadChannel.send({
				embeds: [memberJoinEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}

type TrackerType = 'unknown' | 'permissions' | 'vanity' | 'normal';
