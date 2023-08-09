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
