import { Command } from 'commander';
import { SkillManager } from '../../core/skill-manager.js';
import { logger } from '../../utils/logger.js';

/**
 * list 命令 - 列出已安装的 skills
 */
export const listCommand = new Command('list')
  .alias('ls')
  .description('List installed skills')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    const skillManager = new SkillManager();
    const skills = skillManager.list();

    if (skills.length === 0) {
      logger.info('No skills installed');
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    logger.log(`Installed Skills (${skillManager.getInstallDir()}):`);
    logger.newline();

    const headers = ['Name', 'Version', 'Source'];
    const rows = skills.map(skill => [
      skill.name,
      skill.isLinked ? `${skill.version} (linked)` : skill.version,
      skill.source || '-',
    ]);

    logger.table(headers, rows);
    logger.newline();
    logger.log(`Total: ${skills.length} skill(s)`);
  });

export default listCommand;
