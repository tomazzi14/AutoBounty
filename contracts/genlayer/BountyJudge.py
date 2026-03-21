import json
from genlayer import *


@gl.contract
class BountyJudge:
    """
    GenLayer intelligent contract that evaluates bug bounty submissions.
    Uses AI equivalence principle to judge whether a reported vulnerability is valid.
    """

    bounties: TreeMap[str, dict]
    owner: Address

    def __init__(self):
        self.owner = gl.message.sender
        self.bounties = TreeMap[str, dict]()

    @gl.public.write
    def create_bounty(self, bounty_id: str, description: str, scope: str, severity_levels: str):
        """Register a new bounty for judging."""
        assert gl.message.sender == self.owner, "Only owner can create bounties"
        assert bounty_id not in self.bounties, "Bounty already exists"

        self.bounties[bounty_id] = {
            "description": description,
            "scope": scope,
            "severity_levels": severity_levels,
            "status": "active",
            "submissions": [],
        }

    @gl.public.write
    def submit_report(self, bounty_id: str, reporter: str, report: str) -> None:
        """Submit a vulnerability report for evaluation."""
        assert bounty_id in self.bounties, "Bounty does not exist"
        assert self.bounties[bounty_id]["status"] == "active", "Bounty is not active"

        submission = {
            "reporter": reporter,
            "report": report,
            "verdict": None,
            "severity": None,
        }
        self.bounties[bounty_id]["submissions"].append(submission)

    @gl.public.write
    def judge_submission(self, bounty_id: str, submission_index: int) -> str:
        """Use AI equivalence principle to evaluate a submission."""
        assert bounty_id in self.bounties, "Bounty does not exist"
        bounty = self.bounties[bounty_id]
        assert submission_index < len(bounty["submissions"]), "Invalid submission index"

        submission = bounty["submissions"][submission_index]

        prompt = f"""You are a security expert evaluating a bug bounty submission.

Bounty Description: {bounty['description']}
Scope: {bounty['scope']}
Severity Levels: {bounty['severity_levels']}

Submitted Report:
{submission['report']}

Evaluate this submission and respond with a JSON object:
{{
    "is_valid": true/false,
    "severity": "critical" | "high" | "medium" | "low" | "informational",
    "reasoning": "brief explanation"
}}
"""
        result = gl.exec_prompt(prompt)
        parsed = json.loads(result)

        submission["verdict"] = parsed["is_valid"]
        submission["severity"] = parsed["severity"]
        bounty["submissions"][submission_index] = submission

        return result

    @gl.public.view
    def get_bounty(self, bounty_id: str) -> dict:
        """Get bounty details including submissions."""
        assert bounty_id in self.bounties, "Bounty does not exist"
        return self.bounties[bounty_id]

    @gl.public.view
    def get_verdict(self, bounty_id: str, submission_index: int) -> dict:
        """Get the verdict for a specific submission."""
        assert bounty_id in self.bounties, "Bounty does not exist"
        bounty = self.bounties[bounty_id]
        assert submission_index < len(bounty["submissions"]), "Invalid submission index"
        return bounty["submissions"][submission_index]
