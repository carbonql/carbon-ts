#!/usr/bin/env node

import {Client, query, k8s} from "../../src";
import * as chalk from "chalk";
import * as minimist from "minimist";

const usage = `Usage: ktail [pod-regex] [--stream]`

const argv = minimist(process.argv.slice(2));
const stream = argv.stream != null;

const podRegex =
  argv._.length == 1
  ? RegExp(".+", "g")
  : RegExp(argv._[1], "g");

// --------------------------------------------------------------------------
// Get logs, tail.
// --------------------------------------------------------------------------

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const currNs = c.kubeConfig.getCurrentContextObject().namespace || "default";
c.core.v1.Pod
  // TODO: Change this when I fix the fact that `k8s.KubeConfig` does not retain
  // namespace.
  .list(currNs)
  .flatMap(pod => {
    // Ignore pod if it doesn't match the regex.
    if (!podRegex.test(pod.metadata.name)) return [];

    const logs =
      stream
      ? c.core.v1.Pod.logStream(pod.metadata.name, pod.metadata.namespace)
      : c.core.v1.Pod.logs(pod.metadata.name, pod.metadata.namespace);

    return logs
      .filter(logs => logs != null)
      .window(query.Observable.timer(0, 1000))
      .flatMap(window =>
        window
          .toArray()
          .flatMap(logs => logs.length == 0 ? [] : [logs]))
      .map(logs => {return {name: pod.metadata.name, logs}});
  })
  .forEach(({name, logs}) => {
    console.log(`${chalk.default.green(name)}:`);
    logs.forEach(line => console.log(`${line}`))
  });
