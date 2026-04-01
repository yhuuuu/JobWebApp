export function scoreJob(job, profile) {
  if (!job || !profile) return 0;
  return scoreJobDetailed(job, profile).total;
}

export function scoreJobDetailed(job, profile) {
  if (!job || !profile) return { total: 0, breakdown: [] };

  const breakdown = [];

  // Title match: 30 pts
  const jobTitle = (job.title || '').toLowerCase();
  const targetTitles = profile.targetTitles || [];
  const matchedTitle = targetTitles.find(t =>
    jobTitle.includes(t.toLowerCase()) || t.toLowerCase().includes(jobTitle)
  );
  const titlePts = matchedTitle ? 30 : 0;
  breakdown.push({
    label: 'Job Title',
    pts: titlePts,
    max: 30,
    status: matchedTitle ? 'pass' : 'fail',
    detail: matchedTitle
      ? `"${matchedTitle}" matches your target titles ✅`
      : `No match with your targets (${targetTitles.slice(0, 3).join(', ')}...) ❌`,
  });

  // Skills match: 40 pts
  const searchText = ((job.description || '') + ' ' + (job.title || '')).toLowerCase();
  const skills = profile.skills || [];
  const matchedSkills = skills.filter(s => searchText.includes(s.toLowerCase()));
  const missedSkills = skills.filter(s => !searchText.includes(s.toLowerCase()));
  const skillPts = skills.length > 0 ? Math.min(40, Math.round((matchedSkills.length / skills.length) * 40)) : 0;
  breakdown.push({
    label: 'Skills Match',
    pts: skillPts,
    max: 40,
    status: skillPts >= 20 ? 'pass' : skillPts > 0 ? 'partial' : 'fail',
    detail: matchedSkills.length > 0
      ? `✅ ${matchedSkills.length}/${skills.length} of your skills appear in this job description: ${matchedSkills.slice(0, 5).join(', ')}${matchedSkills.length > 5 ? '…' : ''}`
      : job.description
        ? `❌ None of your skills were mentioned in the job description. The job may not require your stack, or the description may be incomplete.`
        : `📋 No job description pasted — paste the full listing when adding the job for accurate skill scoring.`,
    matched: matchedSkills,
    missed: missedSkills.slice(0, 8),
  });

  // Location match: 20 pts
  const jobLoc = (job.location || '').toLowerCase();
  let locPts = 0;
  let locDetail = '';
  if (jobLoc.includes('remote')) {
    locPts = profile.preferRemote ? 20 : 15;
    locDetail = profile.preferRemote ? 'Remote role — matches your preference ✅' : 'Remote role (you prefer in-office, but still counts) 🟡';
  } else if (profile.location && jobLoc.includes((profile.location || '').split(',')[0].toLowerCase())) {
    locPts = 20;
    locDetail = `Location matches your city (${profile.location}) ✅`;
  } else if (jobLoc) {
    locDetail = `Location "${job.location}" doesn't match your preference (${profile.location || 'not set'}) ❌`;
  } else {
    locPts = 5;
    locDetail = 'No location listed — assumed acceptable 🟡';
  }
  breakdown.push({
    label: 'Location',
    pts: locPts,
    max: 20,
    status: locPts >= 20 ? 'pass' : locPts > 0 ? 'partial' : 'fail',
    detail: locDetail,
  });

  // Salary match: 10 pts
  let salPts = 0;
  let salDetail = '';
  if (job.salary) {
    const sal = Number(job.salary);
    const min = profile.minSalary || 0;
    const max = profile.maxSalary || Infinity;
    if (sal >= min && sal <= max) {
      salPts = 10;
      salDetail = `$${sal.toLocaleString()} is within your range ($${min.toLocaleString()}–$${max.toLocaleString()}) ✅`;
    } else if (sal < min) {
      salDetail = `$${sal.toLocaleString()} is below your minimum of $${min.toLocaleString()} ❌`;
    } else {
      salDetail = `$${sal.toLocaleString()} exceeds your max of $${max.toLocaleString()} ❌`;
    }
  } else {
    salPts = 5;
    salDetail = 'Salary not listed — add it when you find out 🟡';
  }
  breakdown.push({
    label: 'Salary',
    pts: salPts,
    max: 10,
    status: salPts === 10 ? 'pass' : salPts > 0 ? 'partial' : 'fail',
    detail: salDetail,
  });

  return { total: Math.min(100, breakdown.reduce((s, b) => s + b.pts, 0)), breakdown };
}

export function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Low';
}

export function getScoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}
