import { ApplyOptions } from '@sapphire/decorators';
import { Command, type CommandOptions } from '@sapphire/framework';
import {
	ApplicationCommandType,
	PermissionFlagsBits,
	GuildMember,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';

@ApplyOptions<CommandOptions>({
	name: 'warn',
	aliases: ['w'],
	description: 'Warn a user',
	detailedDescription: 'Warn a user for a specific reason',
	requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
	requiredUserPermissions: [PermissionFlagsBits.ModerateMembers | PermissionFlagsBits.Administrator]
})
export class WarnCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to warn').setRequired(true))
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);
		});

		registry.registerContextMenuCommand((builder) => {
			builder
				.setName(this.name)
				.setType(ApplicationCommandType.User) // i missed this part lmao
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.setDMPermission(false);
		});
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('user');
		if (!member) return interaction.reply('Please provide a valid member to warn');

		return this.handleWarning(interaction, member as GuildMember);
	}

	public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		if (!interaction.guild) return;
		const member = await interaction.guild.members.fetch(interaction.targetId);
		if (!member) return interaction.reply('Please provide a valid member to warn');

		return this.handleWarning(interaction, member);
	}

	private handleWarning(command: Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction, member: GuildMember) {
		const reasonTextInput = new TextInputBuilder()
			.setCustomId('warn.reasonInput')
			.setPlaceholder('Please provide a reason for the warning')
			.setLabel('Reason')
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(100)
			.setStyle(TextInputStyle.Paragraph);
		const modalActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonTextInput);
		const reasonModal = new ModalBuilder()
			.setCustomId(`warn.reason.${member.id}`)
			.setTitle(`Warn ${member.displayName}`)
			.addComponents(modalActionRow);

		return command.showModal(reasonModal);
	}
}
