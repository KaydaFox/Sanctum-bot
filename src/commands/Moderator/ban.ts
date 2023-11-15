import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ApplicationCommandType,
	MessageContextMenuCommandInteraction,
	ModalBuilder,
	PermissionFlagsBits,
	TextInputBuilder,
	TextInputStyle,
	User
} from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'ban a member, also DMs them the reason',
	requiredClientPermissions: [PermissionFlagsBits.BanMembers],
	requiredUserPermissions: [PermissionFlagsBits.BanMembers]
})
export class BanCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
				.addUserOption((option) =>
					option //
						.setName('user')
						.setDescription('The user to ban')
						.setRequired(true)
				)
		);

		registry.registerContextMenuCommand((builder) =>
			builder //
				.setName(this.name)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false)
				.setType(ApplicationCommandType.User)
		);

		registry.registerContextMenuCommand((builder) =>
			builder //
				.setName(this.name)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.setDMPermission(false)
				.setType(ApplicationCommandType.Message)
		);
		// I did all 3 command types so that users can either
		// do /ban
		// right click the users > apps > ban
		// OR
		// right click the message > apps > ban
		// this- is probably overkill but I wanted to do it anyway and worst case scenario I can just remove it later
		// * yes- I just copied the kick command and altered it as needed xD
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const user = interaction.options.getUser('user');
		if (!user) return interaction.reply({ content: 'Please provide a valid user', ephemeral: true });

		return this.handleBanModal(interaction, user);
	}

	public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		let user = null;

		if (interaction instanceof MessageContextMenuCommandInteraction) {
			const message = await interaction.channel?.messages.fetch(interaction.targetId);
			if (!message) return interaction.reply({ content: "I'm sorry, i failed to fetch the message. Please try again", ephemeral: true });
			// chances are, if the message is recent itll be in the cache, butttttt-
			// doing a fetch is fine since itll retrieve it from the api if its not in the cache
			user = message.author;
		} else {
			const fetchedUser = await this.container.client.users.fetch(interaction.targetId);
			if (!fetchedUser) return interaction.reply({ content: "I'm sorry, i failed to fetch the user. Please try again", ephemeral: true });

			user = fetchedUser;
		}
		// this is a bit of a mess but it works so im not gonna touch it unless i think of a better way to do it xD

		return this.handleBanModal(interaction, user);
	}

	private async handleBanModal(interaction: Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction, user: User) {
		const member = await interaction.guild!.members.fetch(user).catch(() => null);
		// im just forcing it since- this command can only be ran in the server lol
		if (!member) return interaction.reply({ content: 'Please provide a valid user', ephemeral: true });

		if (member.id === this.container.client.user?.id) return interaction.reply({ content: 'I cannot ban myself >.<', ephemeral: true });
		if (member.id === interaction.user.id) return interaction.reply({ content: 'You cannot ban yourself lol', ephemeral: true });
		if (!member.manageable || !member.bannable) return interaction.reply({ content: 'I cannot ban this user', ephemeral: true });

		const reasonTextInput = new TextInputBuilder()
			.setLabel('Reason')
			.setCustomId('ban.reasonInput')
			.setPlaceholder('Please provide a reason')
			.setMinLength(1)
			.setMaxLength(512)
			.setStyle(TextInputStyle.Paragraph);
		const lengthTextInput = new TextInputBuilder()
			.setLabel('Length')
			.setCustomId('ban.lengthInput')
			.setPlaceholder('[OPTIONAL] Time length of ban. E.g. 1h5m')
			.setMaxLength(512)
			.setRequired(false)
			.setStyle(TextInputStyle.Short);
		const textInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonTextInput);
		const lengthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(lengthTextInput);
		const reasonModal = new ModalBuilder()
			.setTitle(`Ban ${member.user.username}`)
			.addComponents(textInputRow, lengthRow)
			.setCustomId(`ban.modal.${member.id}`);

		return interaction.showModal(reasonModal);
	}
}
