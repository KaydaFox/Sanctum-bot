import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, PermissionFlagsBits, type GuildMember, EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'View information on users'
})
export class UserInfoCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.addUserOption((option) =>
					option.setName('user').setDescription('The user to view. Will default to you if an invalid or no user is supplied')
				)
		);

		registry.registerContextMenuCommand((builder) =>
			builder
				.setName(this.name)
				.setDMPermission(false)
				.setType(ApplicationCommandType.User)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		);
	}

	public chatInputRun(interaction: Command.ChatInputCommandInteraction<'cached'>) {
		const user = interaction.options.getMember('user') ?? interaction.member;

		return this.sendUserInfo(interaction, user);
	}

	public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction<'cached'>) {
		const user = await interaction.guild?.members.fetch(interaction.targetId);

		return this.sendUserInfo(interaction, user);
	}

	private async sendUserInfo(
		interaction: Command.ChatInputCommandInteraction<'cached'> | Command.ContextMenuCommandInteraction<'cached'>,
		user: GuildMember
	) {
		await interaction.deferReply();
		try {
			const warningInfo = await this.fetchWarnings(user.id);

			const inviteInfo = await this.fetchInviteInformation(user.id);

			const UserInfoEmbed = new EmbedBuilder({
				author: {
					name: user.displayName,
					iconURL: user.displayAvatarURL()
				},
				title: 'User information',
				fields: [
					{
						name: 'Joined',
						value: `<t:${Math.floor(user.joinedTimestamp! / 1000)}:R>`,
						inline: true
					},
					{
						name: 'Created',
						value: `<t:${Math.floor(user.user.createdTimestamp / 1000)}:R>`,
						inline: true
					}
				],
				color: user.displayColor
			});

			UserInfoEmbed.addFields({
				name: 'Invite information',
				value: `Invited by ${inviteInfo?.inviterUserId === 'unknown' || !inviteInfo ? 'Unknown user' : `<@${inviteInfo.inviterUserId}>`}`,
				inline: true
			});

			if (warningInfo) {
				UserInfoEmbed.addFields({
					name: 'Warnings issued',
					value: `${warningInfo.count} warning(s)`
				});
				if (warningInfo.mostRecentWarning)
					UserInfoEmbed.addFields({
						name: 'Last warning',
						value: `**From:** <@${warningInfo.mostRecentWarning.moderatorId}> <t:${Math.floor(
							<any>warningInfo.mostRecentWarning.createdAt / 1000
						)}:R>\n\n**Reason:** ${warningInfo.mostRecentWarning.reason}`
					});
			}

			return interaction.editReply({
				embeds: [UserInfoEmbed]
			});
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply('Im sorry, an error occurred whilst running this command');
		}
	}

	private async fetchWarnings(userId: string) {
		const warningsCount = await this.container.prisma.warning.count({
			where: {
				userId: BigInt(userId)
			}
		});

		if (warningsCount < 1) return { count: warningsCount };

		const lastWarning = await this.container.prisma.warning.findFirst({
			where: {
				userId: BigInt(userId)
			},
			orderBy: {
				id: 'desc'
			}
		});

		return { count: warningsCount, mostRecentWarning: lastWarning };
	}

	private async fetchInviteInformation(userId: string) {
		return this.container.prisma.invite.findFirst({
			where: {
				invitedUserId: userId
			}
		});
	}
}
