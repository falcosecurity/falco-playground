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

export const macro1 = `- macro: open_read
  condition: (evt.type in (open,openat,openat2) and evt.is_open_read=true and fd.typechar='f' and fd.num>=0)
`;

export const macro2 = `- macro: open_file_failed
  condition: (evt.type in (open,openat,openat2) and fd.typechar='f' and fd.num=-1 and evt.res startswith E)
`;

export const macro3 = `- macro: etc_dir
  condition: (fd.name startswith /etc/)
`;

export const macro4 = `- macro: user_ssh_directory
  condition: (fd.name contains '/.ssh/' and fd.name glob '/home/*/.ssh/*')
`;

export const macro5 = `- macro: directory_traversal
  condition: (fd.nameraw contains '../' and fd.nameraw glob '*../*../*')
`;

export const rule = `- rule: Directory traversal monitored file read
  desc: >
    Web applications can be vulnerable to directory traversal attacks that allow accessing files outside of the web app's root directory (e.g. Arbitrary File Read bugs).
System directories like /etc are typically accessed via absolute paths. Access patterns outside of this (here path traversal) can be regarded as suspicious.
This rule includes failed file open attempts.
`;

export const condition = `condition: (open_read or open_file_failed) and (etc_dir or user_ssh_directory or fd.name startswith /root/.ssh or fd.name contains "id_rsa") and directory_traversal and not proc.pname in (shell_binaries)
  enabled: true`;
