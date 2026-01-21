import { Command } from 'commander';
import { SkillManager } from '../../core/skill-manager.js';
import { logger } from '../../utils/logger.js';

/**
 * link 命令 - 链接本地 skill
 */
const linkCmd = new Command('link')
  .description('Link a local skill for development')
  .argument('<path>', 'Path to local skill directory')
  .option('-n, --name <name>', 'Custom skill name')
  .action((localPath, options) => {
    const skillManager = new SkillManager();

    try {
      const linked = skillManager.link(localPath, options.name);
      logger.log(`Linked skill available at: ${linked.path}`);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

/**
 * unlink 命令 - 取消链接
 */
const unlinkCmd = new Command('unlink')
  .description('Unlink a linked skill')
  .argument('<skill>', 'Skill name to unlink')
  .action((skillName) => {
    const skillManager = new SkillManager();
    const result = skillManager.unlink(skillName);

    if (!result) {
      process.exit(1);
    }
  });

export const linkCommand = linkCmd;
export const unlinkCommand = unlinkCmd;
export default linkCommand;
