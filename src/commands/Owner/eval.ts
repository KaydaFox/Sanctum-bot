import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { Stopwatch } from '@sapphire/stopwatch';
import { codeBlock, isThenable } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { inspect } from 'util';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	aliases: ['ev'],
	description: 'Evals any JavaScript code',
	quotes: [],
	flags: ['async', 'hidden', 'showHidden', 'silent', 's'],
	options: ['depth'],
	typing: true
})
export class UserCommand extends Command {
	public async messageRun(message: Message, args: Args) {
		if (message.author.id !== '717329527696785408') return;
		const code = await args.rest('string');

		const stopwatch = new Stopwatch();
		const { result, success } = await this.eval(message, code, {
			async: args.getFlags('async'),
			depth: Number(args.getOption('depth')) ?? 0,
			showHidden: args.getFlags('hidden', 'showHidden')
		});
		const timeTaken = stopwatch.toString();

		result.replaceAll(this.container.client.token || envParseString('DISCORD_TOKEN'), '[REEEEEEEEEEE]');

		const output = success ? codeBlock('js', result) : `**ERROR**: ${codeBlock('bash', result)}`;
		if (args.getFlags('silent', 's')) return null;

		const fullTimeTaken = stopwatch.stop().toString();
		const timeFooter = `**Time**: ⏱️${timeTaken}<${fullTimeTaken}>`;

		if (output.length > 1900) {
			return message.reply({
				content: `Output was too long... sent the result as a file.\n\n${timeFooter}`,
				files: [{ attachment: Buffer.from(output), name: 'output.js' }]
			});
		}

		return message.reply(`${output}\n${timeFooter}`);
	}

	private async eval(
		message: Message | Command.ChatInputCommandInteraction,
		code: string,
		flags: { async: boolean; depth: number; showHidden: boolean }
	) {
		if (flags.async) code = `(async () => {\n${code}\n})();`;

		// @ts-expect-error value is never read, this is so `msg` is possible as an alias when sending the eval.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const msg = message;

		// @ts-expect-error value is never read as it's only used for eval discord side.
		function schedule<T>(timeMs: number, executor: () => T): Promise<T> {
			return new Promise((resolve) => setTimeout(() => resolve(executor()), timeMs));
		}

		let success = true;
		let result = null;

		try {
			// eslint-disable-next-line no-eval
			result = eval(code);
		} catch (error) {
			if (error && error instanceof Error && error.stack) {
				this.container.client.logger.error(error);
			}
			result = error;
			success = false;
		}

		if (isThenable(result)) result = await result;

		if (typeof result !== 'string') {
			result = inspect(result, {
				depth: flags.depth,
				showHidden: flags.showHidden
			});
		}

		return { result, success };
	}
}
