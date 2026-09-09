param([Parameter(Mandatory=$true)][string]$Path,[switch]$Create)
Add-Type -AssemblyName System.Security
if ($Create) {
  if (Test-Path -LiteralPath $Path) { throw 'A backup key already exists; refusing to overwrite it.' }
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  $protected = [System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
  [System.IO.File]::WriteAllBytes($Path,$protected)
  # Keep this owner-only recovery key OFFLINE, separate from the backup computer.
  [System.IO.File]::WriteAllText(($Path+'.recovery.txt'),[Convert]::ToBase64String($bytes))
  [Array]::Clear($bytes,0,$bytes.Length)
  $rng.Dispose()
} else {
  $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect([System.IO.File]::ReadAllBytes($Path),$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Write([Convert]::ToBase64String($bytes))
  [Array]::Clear($bytes,0,$bytes.Length)
}
