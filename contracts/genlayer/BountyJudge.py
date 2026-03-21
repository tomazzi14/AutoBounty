# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json

from genlayer import *


class BountyJudge(gl.Contract):
    approved: bool
    score: i32
    reasoning: str
    pr_url: str
    evaluated: bool

    def __init__(self):
        self.approved = False
        self.score = i32(0)
        self.reasoning = ""
        self.pr_url = ""
        self.evaluated = False

    @gl.public.write
    def evaluate(self, issue_url: str, pr_url: str):
        issue_api = issue_url.replace(
            "github.com", "api.github.com/repos"
        )
        pr_api = pr_url.replace(
            "github.com", "api.github.com/repos"
        ).replace("/pull/", "/pulls/")

        headers = {"Accept": "application/vnd.github.v3+json"}

        task = (
            "Evaluate whether this Pull Request resolves the GitHub issue. "
            "Check: (1) PR title/description vs issue requirements, "
            "(2) changed files relevance, (3) CI checks status. "
            "Respond ONLY with JSON: "
            '{"approved": true/false, "score": 0-10, "reasoning": "brief explanation"}'
        )

        criteria = (
            "The output must be valid JSON with exactly three fields: "
            "approved (boolean), score (integer 0-10), reasoning (short string). "
            "The verdict should be reasonable given the issue requirements and PR changes."
        )

        def get_github_data():
            issue_resp = gl.nondet.web.get(issue_api, headers=headers)
            issue_data = issue_resp.body.decode("utf-8")

            pr_resp = gl.nondet.web.get(pr_api, headers=headers)
            pr_data = pr_resp.body.decode("utf-8")

            pr_files_resp = gl.nondet.web.get(pr_api + "/files", headers=headers)
            pr_files_data = pr_files_resp.body.decode("utf-8")

            return (
                f"ISSUE DATA:\n{issue_data}\n\n"
                f"PULL REQUEST DATA:\n{pr_data}\n\n"
                f"FILES CHANGED:\n{pr_files_data}"
            )

        result = (
            gl.eq_principle.prompt_non_comparative(
                get_github_data,
                task=task,
                criteria=criteria,
            )
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        parsed = json.loads(result)
        self.approved = bool(parsed["approved"])
        self.score = i32(parsed["score"])
        self.reasoning = str(parsed["reasoning"])
        self.pr_url = pr_url
        self.evaluated = True

    @gl.public.view
    def get_verdict(self) -> dict:
        return {
            "approved": self.approved,
            "score": int(self.score),
            "reasoning": self.reasoning,
            "pr_url": self.pr_url,
            "evaluated": self.evaluated,
        }

    @gl.public.view
    def get_approved(self) -> bool:
        return self.approved

    @gl.public.view
    def get_score(self) -> int:
        return int(self.score)

    @gl.public.view
    def get_reasoning(self) -> str:
        return self.reasoning
