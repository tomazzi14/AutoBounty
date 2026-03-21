# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import typing


@gl.contract
class BountyJudge:
    verdicts: TreeMap[str, str]

    def __init__(self):
        self.verdicts = TreeMap[str, str]()

    @gl.public.write
    def evaluate(self, issue_url: str, pr_url: str):
        # Build API URLs from GitHub web URLs
        issue_api = issue_url.replace(
            "github.com", "api.github.com/repos"
        )
        pr_api = pr_url.replace(
            "github.com", "api.github.com/repos"
        ).replace("/pull/", "/pulls/")

        headers = {"Accept": "application/vnd.github.v3+json"}

        # Fetch GitHub data (non-deterministic web calls)
        issue_resp = gl.nondet.web.get(issue_api, headers=headers)
        issue_data = issue_resp.body.decode("utf-8")

        pr_resp = gl.nondet.web.get(pr_api, headers=headers)
        pr_data = pr_resp.body.decode("utf-8")

        pr_files_resp = gl.nondet.web.get(pr_api + "/files", headers=headers)
        pr_files_data = pr_files_resp.body.decode("utf-8")

        # Combine all data for the LLM prompt
        combined = (
            f"ISSUE DATA:\n{issue_data}\n\n"
            f"PULL REQUEST DATA:\n{pr_data}\n\n"
            f"FILES CHANGED:\n{pr_files_data}"
        )

        task = (
            "Evaluate whether this Pull Request resolves the GitHub issue. "
            "Check: (1) PR title/description vs issue requirements, "
            "(2) changed files relevance, (3) CI checks status. "
            "Respond ONLY with JSON: "
            '{\"approved\": true/false, \"score\": 0-10, \"reasoning\": \"brief explanation\"}'
        )

        criteria = (
            "The output must be valid JSON with exactly three fields: "
            "approved (boolean), score (integer 0-10), reasoning (short string). "
            "The verdict should be reasonable given the issue requirements and PR changes."
        )

        result = gl.eq_principle.prompt_non_comparative(
            lambda: combined,
            task=task,
            criteria=criteria,
        )

        self.verdicts[pr_url] = result

    @gl.public.view
    def get_verdict(self, pr_url: str) -> str:
        return self.verdicts[pr_url]
