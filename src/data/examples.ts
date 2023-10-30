// SPDX-License-Identifier: Apache-2.0
/*
Copyright (C) 2023 The Falco Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

export const example1 = `- macro: open_read
  condition: (evt.type in (open,openat,openat2) and evt.is_open_read=true and fd.typechar='f' and fd.num>=0)

- rule: Read Shell Configuration File
  desc: Detect attempts to read shell configuration files by non-shell programs
  condition: >
    open_read and
    (fd.filename in (shell_config_filenames) or
     fd.name in (shell_config_files) or
     fd.directory in (shell_config_directories)) and
    (not proc.name in (shell_binaries))
  enabled: false
  output: >
    a shell configuration file was read by a non-shell program (user=%user.name user_loginuid=%user.loginuid command=%proc.cmdline pid=%proc.pid file=%fd.name container_id=%container.id image=%container.image.repository)
  priority:
    WARNING
  tags: [host, container, filesystem, mitre_discovery, T1546.004]
`;

export const example2 = `- macro: open_read
  condition: (evt.type in (open,openat,openat2) and evt.is_open_read=true and fd.typechar='f' and fd.num>=0)

- macro: open_file_failed
  condition: (evt.type in (open,openat,openat2) and fd.typechar='f' and fd.num=-1 and evt.res startswith E)

- macro: etc_dir
  condition: (fd.name startswith /etc/)

- macro: user_ssh_directory
  condition: (fd.name contains '/.ssh/' and fd.name glob '/home/*/.ssh/*')

- macro: directory_traversal
  condition: (fd.nameraw contains '../' and fd.nameraw glob '*../*../*')

- rule: Directory traversal monitored file read
  desc: >
    Web applications can be vulnerable to directory traversal attacks that allow accessing files outside of the web app's root directory (e.g. Arbitrary File Read bugs).
    System directories like /etc are typically accessed via absolute paths. Access patterns outside of this (here path traversal) can be regarded as suspicious.
    This rule includes failed file open attempts.
  condition: (open_read or open_file_failed) and (etc_dir or user_ssh_directory or fd.name startswith /root/.ssh or fd.name contains "id_rsa") and directory_traversal and not proc.pname in (shell_binaries)
  enabled: true
  output: >
    Read monitored file via directory traversal (username=%user.name useruid=%user.uid user_loginuid=%user.loginuid program=%proc.name exe=%proc.exepath
    command=%proc.cmdline pid=%proc.pid parent=%proc.pname file=%fd.name fileraw=%fd.nameraw parent=%proc.pname
    gparent=%proc.aname[2] container_id=%container.id image=%container.image.repository returncode=%evt.res cwd=%proc.cwd)
  priority: WARNING
  tags: [host, container, filesystem, mitre_discovery, mitre_exfiltration, mitre_credential_access, T1555, T1212, T1020, T1552, T1083]
`;

export const example3 = `- macro: user_ssh_directory
  condition: (fd.name contains '/.ssh/' and fd.name glob '/home/*/.ssh/*')

- macro: never_true
  condition: (evt.num=0)

- macro: open_read
  condition: (evt.type in (open,openat,openat2) and evt.is_open_read=true and fd.typechar='f' and fd.num>=0)

- macro: open_directory
  condition: (evt.type in (open,openat,openat2) and evt.is_open_read=true and fd.typechar='d' and fd.num>=0)

- macro: user_known_read_ssh_information_activities
  condition: (never_true)

- rule: Read ssh information
  desc: Any attempt to read files below ssh directories by non-ssh programs
  condition: >
    ((open_read or open_directory) and
     (user_ssh_directory or fd.name startswith /root/.ssh) and
     not user_known_read_ssh_information_activities and
     not proc.name in (ssh_binaries))
  enabled: false
  output: >
    ssh-related file/directory read by non-ssh program (user=%user.name user_loginuid=%user.loginuid
    command=%proc.cmdline pid=%proc.pid file=%fd.name parent=%proc.pname pcmdline=%proc.pcmdline container_id=%container.id image=%container.image.repository)
  priority: ERROR
  tags: [host, container, filesystem, mitre_discovery, T1005]
`;
