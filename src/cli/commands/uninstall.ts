import { Command } from 'commander';
import { SkillManager } from '../../core/skill-manager.js';

/**
 * uninstall 命令 - 卸载 skill
 */
export const uninstallCommand = new Command('uninstall')
  .alias('un')
  .alias('remove')
  .alias('rm')
  .description('Uninstall a skill')
  .argument('<skill>', 'Skill name to uninstall')
  .action((skillName) => {
    const skillManager = new SkillManager();
    const result = skillManager.uninstall(skillName);

    if (!result) {
      process.exit(1);
    }
  });

export default uninstallCommand;
