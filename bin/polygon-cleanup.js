#!/usr/bin/env node

const { program } = require('commander');
const secretsService = require('./../lib/secrets');
const instanceProfilesService = require('../lib/iam-instance-profiles');

program
    .command('secrets --region --profile --query')
    .description('run secrets manager cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete secrets matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await secretsService.clean({ region, awsProfile: profile, query });
    });

program
    .command('instance-profiles --region --profile --query')
    .description('run iam-instance-profiles cleanup for the specified region/awsProfile')
    .option('--region <region>', 'The AWS region to perform the action on')
    .option('--profile <profileName>', 'The AWS profile to use')
    .option("-q, --query [string]", "Incase you want to delete secrets matching a specific search term")
    .action(async function ({ region, profile, query = '' }) {
        await instanceProfilesService.clean({ region, awsProfile: profile, query });
    });

program.parse(process.argv);
