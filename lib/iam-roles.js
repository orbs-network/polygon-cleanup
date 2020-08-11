const inquirer = require('inquirer');
const chalk = require('chalk');
const { uniqBy } = require('lodash');

const { exec } = require('./tooling/exec');
const { _clean } = require('./secrets');

const service = {
    async getIAMRoles() {
        const result = await exec(`aws iam list-roles --profile ${this.awsProfile} --region ${this.region}`);
        return JSON.parse(result.stdout);
    },
    prepareQuestion({ list, region }) {
        return `You are about to destroy ${chalk.whiteBright(list.length)} IAM roles in the following AWS region: ${region}\n
${chalk.redBright('This operation cannot be undone, therefore please proceed with caution!')} \n
----------------------------------------------------------\n
The following IAM roles are to be permanently deleted:\n
        ${list.map(s => chalk.whiteBright(`${s.RoleName}`))}\n\n`;
    },
    async getOrphanedPolicies() {
        const result = await exec(`aws iam list-policies --profile ${this.awsProfile} --region ${this.region}`);
        const { Policies } = JSON.parse(result.stdout);

        // Apply general filters so we don't delete anything important by mistake

        let list = [].concat(Policies.filter(p => p.PolicyName.indexOf('constellation-') !== -1));
        list = list.concat(Policies.filter(p => p.PolicyName.indexOf('orbs-') !== -1));
        list = list.concat(Policies.filter(p => p.PolicyName.indexOf('manager-') !== -1));
        list = list.concat(Policies.filter(p => p.PolicyName.indexOf('worker-') !== -1));
        return uniqBy(list, 'PolicyName');
    },
    async deletePolicy({ policyArn }) {
        return exec(`aws iam delete-policy --policy-arn ${policyArn} --profile ${this.awsProfile} --region ${this.region}`);
    },
    async getAttachedRolePolicies({ roleName }) {
        const result = await exec(`aws iam list-attached-role-policies --role-name ${roleName} --profile ${this.awsProfile} --region ${this.region}`);
        return (JSON.parse(result.stdout)).AttachedPolicies || [];
    },
    async detachRolePolicy({ roleName, policyArn }) {
        return exec(`aws iam detach-role-policy --role-name ${roleName} --policy-arn ${policyArn} --profile ${this.awsProfile} --region ${this.region}`);
    },
    async deleteIAMRole({ roleName, }) {
        return exec(`aws iam delete-role --role-name ${roleName} --profile ${this.awsProfile} --region ${this.region}`);
    },
    async _clean({ list, query }) {
        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            console.log(`Deleting IAM role ${chalk.white(item.RoleName)} (${i + 1} out of ${list.length})...`);

            let policies = await this.getAttachedRolePolicies({ roleName: item.RoleName });

            for (let ii = 0; ii < policies.length; ii++) {
                let result = await this.detachRolePolicy({ roleName: item.RoleName, policyArn: policies[ii].PolicyArn });
                if (result.exitCode === 0) {
                    console.log(`Successfully detached policy with ARN: ${policies[ii].PolicyArn}`);
                }
            }

            const result = await this.deleteIAMRole({ roleName: item.RoleName });
            if (result.exitCode === 0) {
                console.log(chalk.greenBright(`IAM role ${item.RoleName} was deleted successfully!`));
            }
            console.log('');
        }

        console.log('Cleaning up any orphaned IAM policies that might have been left behind...');
        const orphanedPolicies = await this.getOrphanedPolicies();
        const finalOrphanedPolicies = (query.length > 0) ? orphanedPolicies.filter(p => p.PolicyName.indexOf(query) !== -1) : orphanedPolicies;

        console.log(`Found ${finalOrphanedPolicies.length} policies to clean`);
        console.log('');

        for (let o in finalOrphanedPolicies) {
            let item = finalOrphanedPolicies[o];
            console.log(`Removing orphaned policy with name: ${item.PolicyName} ...`);
            let result = await this.deletePolicy({ policyArn: item.Arn });
            if (result.exitCode !== 0) {
                console.log(result);
            }
        }

        console.log(chalk.greenBright(`Successfully deleted all ${list.length} IAM roles and ${finalOrphanedPolicies.length} policies!`));
    },
    async clean({ region, awsProfile, query = '', autoApprove = false }) {
        this.awsProfile = awsProfile;
        this.region = region;

        const { Roles } = await this.getIAMRoles();
        const appenders = ['-manager', '-worker'];
        let list = [];

        for (let n in appenders) {
            if (appenders[n].length > 0) {
                let filterByStr = `${query}${appenders[n]}`;
                list = list.concat(Roles.filter(r => r.RoleName.indexOf(filterByStr) !== -1));
            }
        }

        if (list.length === 0) {
            console.log(chalk.green('No IAM roles found'));
        }

        if (!autoApprove) {
            console.log(this.prepareQuestion({ list, region }));

            inquirer.prompt([
                {
                    type: 'input',
                    name: 'confirm',
                    default: 'y',
                    message: `Proceed with destruction of ${list.length} IAM instance profiles?`
                }
            ]).then(async (answers) => {
                if (answers.confirm === 'y' || answers.confirm === 'Y' || answers.confirm === 'yes') {
                    await this._clean({ list, query });
                }
            });
        } else {
            await this._clean({ list, query });
        }
    }
};

module.exports = service;