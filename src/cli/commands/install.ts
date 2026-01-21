import { Command } from 'commander';
import ora from 'ora';
import { SkillManager } from '../../core/skill-manager.js';
import { ConfigLoader } from '../../core/config-loader.js';
import { logger } from '../../utils/logger.js';

/**
 * install 命令 - 安装 skill
 */
export const installCommand = new Command('install')
  .alias('i')
  .description('Install a skill or all skills from skills.json')
  .argument('[skill]', 'Skill reference (e.g., github:user/skill@v1.0.0)')
  .option('-f, --force', 'Force reinstall even if already installed')
  .option('--no-save', 'Do not save to skills.json')
  .action(async (skill, options) => {
    const configLoader = new ConfigLoader();
    const skillManager = new SkillManager();

    if (!skill) {
      // Install all from skills.json
      if (!configLoader.exists()) {
        logger.error("skills.json not found. Run 'skpm init' first.");
        process.exit(1);
      }

      const skills = configLoader.getSkills();
      if (Object.keys(skills).length === 0) {
        logger.info('No skills defined in skills.json');
        return;
      }

      logger.package('Installing all skills from skills.json...');
      const spinner = ora('Installing...').start();

      try {
        const installed = await skillManager.installAll({ force: options.force });
        spinner.stop();
        
        logger.newline();
        logger.success(`Installed ${installed.length} skill(s)`);
      } catch (error) {
        spinner.fail('Installation failed');
        logger.error((error as Error).message);
        process.exit(1);
      }
    } else {
      // Install single skill
      const spinner = ora(`Installing ${skill}...`).start();

      try {
        const installed = await skillManager.install(skill, {
          force: options.force,
          save: options.save,
        });
        
        spinner.succeed(`Installed ${installed.name}@${installed.version}`);
      } catch (error) {
        spinner.fail('Installation failed');
        logger.error((error as Error).message);
        process.exit(1);
      }
    }
  });

export default installCommand;
