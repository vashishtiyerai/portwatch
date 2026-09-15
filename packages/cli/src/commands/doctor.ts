import { getPlatformProvider, DoctorService } from '@portwatch/core';

export async function handleDoctorCommand(json: boolean = false): Promise<number> {
  const provider = getPlatformProvider();
  const doctor = new DoctorService(provider);

  const report = await doctor.runDiagnostics();

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(doctor.formatReport(report) + '\n');
  }

  // If any critical check failed, exit code 1
  const hasFailure = report.checks.some(c => c.status === 'FAIL');
  return hasFailure ? 1 : 0;
}
