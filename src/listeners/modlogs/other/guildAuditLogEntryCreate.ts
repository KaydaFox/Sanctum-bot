import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, EmbedBuilder, Events, GuildAuditLogsEntry, type AuditLogChange } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.GuildAuditLogEntryCreate
})
export class GuildAuditLogEntryCreateListener extends Listener {
	public run(entry: GuildAuditLogsEntry) {
		switch (entry.action) {
			// roles
			case AuditLogEvent.RoleCreate:
				return this.handleRoleCreate(entry);
			case AuditLogEvent.RoleDelete:
				return this.handleRoleDelete(entry);
			case AuditLogEvent.RoleUpdate:
				return this.handleRoleUpdate(entry);
			case AuditLogEvent.ChannelCreate:
				return this.handleChannelCreate(entry);
			case AuditLogEvent.ChannelUpdate:
				return this.handleChannelUpdate(entry);
			case AuditLogEvent.ChannelDelete:
				return this.handleChannelDelete(entry);

			default:
				return null;
		}
	}

	private async handleRoleCreate(entry: GuildAuditLogsEntry) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('ROLES');

			const moderator = await this.container.client.users.fetch(entry.executorId!);

			const roleCreatedEmbed = new EmbedBuilder()
				.setAuthor({
					name: moderator.username || 'Unknwon User',
					iconURL: moderator.displayAvatarURL() || undefined
				})
				.setTitle(`Role created`)
				.addFields({
					name: 'Role',
					value: entry.target?.toString() ?? 'Failed to fetch data'
				});

			this.handleAddingChangesToEmbed(entry.changes, roleCreatedEmbed);

			return threadChannel.send({
				embeds: [roleCreatedEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleRoleDelete(entry: GuildAuditLogsEntry) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('ROLES');

			const moderator = await this.container.client.users.fetch(entry.executorId!);

			const roleDeletedEmbed = new EmbedBuilder()
				.setAuthor({
					name: moderator.username || 'Unknwon User',
					iconURL: moderator.displayAvatarURL() || undefined
				})
				.setTitle(`Role deleted`)
				.addFields({
					name: 'Role',
					value: entry.changes[0].old?.toString() ?? `<@&${entry.targetId}>` ?? 'Failed to fetch data'
				});

			return threadChannel.send({
				embeds: [roleDeletedEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleRoleUpdate(entry: GuildAuditLogsEntry) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('ROLES');

			const moderator = await this.container.client.users.fetch(entry.executorId!);

			const roleUpdatedEmbed = new EmbedBuilder()
				.setAuthor({
					name: moderator.username || 'Unknwon User',
					iconURL: moderator.displayAvatarURL() || undefined
				})
				.setTitle(`Role updated`)
				.addFields({
					name: 'Role',
					value: entry.target?.toString() ?? 'Failed to fetch data'
				});

			this.handleAddingChangesToEmbed(entry.changes, roleUpdatedEmbed);

			return threadChannel.send({
				embeds: [roleUpdatedEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	// channels - yeah... this is pretty much the same code as the above lmfaoo
	private async handleChannelCreate(entry: GuildAuditLogsEntry) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('CHANNELS');

			const moderator = await this.container.client.users.fetch(entry.executorId!);

			const channelCreatedEmbed = new EmbedBuilder()
				.setAuthor({
					name: moderator.username || 'Unknwon User',
					iconURL: moderator.displayAvatarURL() || undefined
				})
				.setTitle(`Channel created`)
				.addFields({
					name: 'Channel',
					value: entry.target?.toString() ?? 'Failed to fetch data'
				});

			this.handleAddingChangesToEmbed(entry.changes, channelCreatedEmbed);

			return threadChannel.send({
				embeds: [channelCreatedEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleChannelUpdate(entry: GuildAuditLogsEntry) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('CHANNELS');

			const moderator = await this.container.client.users.fetch(entry.executorId!);

			const channelUpdatedEmbed = new EmbedBuilder()
				.setAuthor({
					name: moderator.username || 'Unknwon User',
					iconURL: moderator.displayAvatarURL() || undefined
				})
				.setTitle(`Channel updated`)
				.addFields({
					name: 'Channel',
					value: entry.target?.toString() ?? 'Failed to fetch data'
				});

			this.handleAddingChangesToEmbed(entry.changes, channelUpdatedEmbed);

			return threadChannel.send({
				embeds: [channelUpdatedEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleChannelDelete(entry: GuildAuditLogsEntry) {
		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('CHANNELS');

			const moderator = await this.container.client.users.fetch(entry.executorId!);

			const channelDeletedEmbed = new EmbedBuilder()
				.setAuthor({
					name: moderator.username || 'Unknwon User',
					iconURL: moderator.displayAvatarURL() || undefined
				})
				.setTitle(`Channel deleted`)
				.addFields({
					name: 'Channel',
					value: entry.changes[0].old?.toString() ?? `<#${entry.targetId}>` ?? 'Failed to fetch data'
				});

			return threadChannel.send({
				embeds: [channelDeletedEmbed]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private handleAddingChangesToEmbed(changes: AuditLogChange[], embed: EmbedBuilder) {
		changes.forEach((change) => {
			if (embed.data.fields!.length >= 24) return;
			if (change.key === 'permission_overwrites') return;

			embed.addFields({
				name: change.key,
				value: `**Old:** ${change.old?.toString() || 'Not set'}\n**New:** ${change.new?.toString() || 'Not set'}`,
				inline: true
			});
		});
	}
}
