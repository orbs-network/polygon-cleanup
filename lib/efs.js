const inquirer = require('inquirer');
const chalk = require('chalk');

const { exec } = require('./tooling/exec');
const { _clean } = require('./secrets');

const service = {
    async getEFSDrives() {
        const result = await exec(`aws efs describe-file-systems --profile ${this.awsProfile} --region ${this.region}`);
        return JSON.parse(result.stdout);
    },
    prepareQuestion({ list }) {
        return `You are about to destroy ${list.length} EFS drives (file systems) in the following AWS region: ${this.region}\n
${chalk.redBright('This operation cannot be undone, therefore please proceed with caution!')} \n
----------------------------------------------------------\n
The following EFS drives are to be permanently deleted:\n
        ${list.map(s => chalk.whiteBright(`${s.Name} (${s.FileSystemId})`))}\n\n`;
    },
    async getMountTargetsForFileSystem({ FileSystemId }) {
        const result = await exec(`aws efs describe-mount-targets --file-system-id ${FileSystemId} --profile ${this.awsProfile} --region ${this.region}`);
        const { MountTargets } = JSON.parse(result.stdout);
        return MountTargets;
    },
    async deleteMountTarget({ MountTargetId }) {
        return exec(`aws efs delete-mount-target --mount-target-id ${MountTargetId} --profile ${this.awsProfile} --region ${this.region}`);
    },
    async deleteEFSDrive({ FileSystemId }) {
        return exec(`aws efs delete-file-system --file-system-id ${FileSystemId} --profile ${this.awsProfile} --region ${this.region}`);
    },
    async _clean({ list }) {
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            const { FileSystemId, Name } = item;

            console.log(`Deleting EFS file system ${chalk.white(Name)} (${i + 1} out of ${list.length})...`);
            console.log(`Checking for existing mount targets..`);

            let mountTargets = await this.getMountTargetsForFileSystem({ FileSystemId });
            for (let ii = 0; ii < mountTargets.length; ii++) {
                let someMountTarget = mountTargets[ii];
                let deleteMountResult = await this.deleteMountTarget({ MountTargetId: someMountTarget.MountTargetId });
                if (deleteMountResult.exitCode !== 0) {
                    console.log(deleteMountResult);
                }
            }

            const result = await this.deleteEFSDrive({ FileSystemId });
            if (result.exitCode === 0) {
                console.log(chalk.greenBright(`EFS file system ${Name} was deleted successfully!`));
            }
            console.log('');
        }

        console.log(chalk.greenBright(`Successfully deleted all ${list.length} EFS file systems!`));
    },
    async clean({ region, awsProfile, query = '', autoApprove = false }) {
        this.region = region;
        this.awsProfile = awsProfile;

        const { FileSystems } = await this.getEFSDrives();
        let list = (query.length > 0) ? FileSystems.filter(k => k.Name.indexOf(query) !== -1) : FileSystems;

        if (list.length === 0) {
            console.log(chalk.green('No EFS file systems found'));
            return;
        }

        if (!autoApprove) {
            console.log(this.prepareQuestion({ list }));

            inquirer.prompt([
                {
                    type: 'input',
                    name: 'confirm',
                    default: 'y',
                    message: `Proceed with destruction of ${list.length} EFS file systems?`
                }
            ]).then(async (answers) => {
                if (answers.confirm === 'y' || answers.confirm === 'Y' || answers.confirm === 'yes') {
                    await this._clean({ list });
                }
            });
        } else {
            await this._clean({ list });
        }
    }
};

module.exports = service;