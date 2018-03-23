#!/usr/bin/env node

import {Client, query, k8s} from "../../src";
import * as chalk from "chalk";

if (process.argv.length < 3) {
  console.log(`Usage: kgrep <log-regex> <pod-regex>`)
  process.exit(1);
}

const re = RegExp(process.argv[2], "g");

// --------------------------------------------------------------------------
// Helpers.
// --------------------------------------------------------------------------

const filterAndColorize = (lines: string[]): string[][] => {
  const filtered = [];
  for (const line of lines) {
    let slices = [];
    let match = null;
    let lastIndex = 0;
    let foundMatch = false;
    while ((match = re.exec(line)) !== null) {
      slices.push(line.slice(lastIndex, match.index));
      slices.push(
        chalk.default.red(
          line.slice(match.index, match.index + match[0].length)))
      lastIndex = match.index + match[0].length;
      foundMatch = true;
    }

    if (foundMatch) {
      slices.push(line.slice(lastIndex));
      filtered.push(slices.join(""));
    }
  }
  return filtered.length > 0 ? [filtered] : [];
}

// --------------------------------------------------------------------------
// Get logs, grep.
// --------------------------------------------------------------------------

const c = Client.fromFile(<string>process.env.KUBECONFIG);
c.core.v1.Pod
  .list("default")
  .flatMap(pod =>
    c.core.v1.Pod
      .logs(pod.metadata.name, pod.metadata.namespace)
      .filter(logs => logs != null)
      .map(logs => logs.split(/\r?\n/))
      .flatMap(filterAndColorize)
      .map(lines => {return {pod: pod, logsLines: lines}}))
  .forEach(({pod, logsLines}) => {
    logsLines.forEach(line => {
      console.log(`${pod.metadata.name}: ${line}`)
    });
  });
