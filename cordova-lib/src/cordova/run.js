/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var cordova_util      = require('./util'),
    path              = require('path'),
    HooksRunner            = require('../hooks/HooksRunner'),
    events            = require('../events'),
    superspawn        = require('./superspawn'),
    Q                 = require('q');

// Returns a promise.
module.exports = function run(options) {
    var projectRoot = cordova_util.cdProjectRoot();
    options = cordova_util.preProcessOptions(options);

    options.stdio = options.stdio || 'inherit';

    var hooksRunner = new HooksRunner(projectRoot);
    return hooksRunner.fire('before_run', options)
    .then(function() {
        // Run a prepare first, then shell out to run
        return require('./cordova').raw.prepare(options);
    }).then(function() {
        // Deploy in parallel (output gets intermixed though...)
        return Q.all(options.platforms.map(function(platform) {
            var cmd = path.join(projectRoot, 'platforms', platform, 'cordova', 'run');
            return superspawn.spawn(cmd, options.options, { printCommand: true, stdio: options.stdio, chmod: true });
        }));
    }).then(function() {
        return hooksRunner.fire('after_run', options);
    }, function(error) {
        events.emit('log', 'ERROR running one or more of the platforms: ' + error + '\nYou may not have the required environment or OS to run this project');
        throw error;
    });
};
