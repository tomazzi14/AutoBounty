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
        issue_api = issue_url.replace("github.com", "api.github.com/repos").replace("/issues/", "/issues/")
        pr_api = pr_url.replace("github.com", "api.github.com/repos").replace("/pull/", "/pulls/")
        headers = {"Accept": "application/vnd.github.v3+json"}

        issue_data = gl.nondet.web.get(issue_api, headers=headers)
        pr_data = gl.nondet.web.get(pr_api, headers=headers)
        pr_files_data = gl.nondet.web.get(pr_api + "/files", headers=headers)

        task = (
            f"Evaluate whether this Pull Request resolves the GitHub issue.\n\n"
            f"ISSUE:\n{issue_data}\n\n"
            f"PULL REQUEST:\n{pr_data}\n\n"
            f"FILES CHANGED:\n{pr_files_data}\n\n"
            f"Check the following:\n"
            f"1. Does the PR title/description address the issue requirements?\n"
            f"2. Do the changed files relate to the issue?\n"
            f"3. Are CI checks passing?\n\n"
            f"Respond with JSON: {{\"approved\": bool, \"score\": 0-10, \"reasoning\": \"brief explanation\"}}"
        )

        criteria = (
            "The output must be valid JSON with exactly three fields: "
            "\"approved\" (boolean), \"score\" (integer 0-10), and \"reasoning\" (short string). "
            "The verdict should be reasonable given the issue requirements and PR changes."
        )

        result = gl.eq_principle.prompt_non_comparative(task=task, criteria=criteria)
        self.verdicts[pr_url] = result

    @gl.public.view
    def get_verdict(self, pr_url: str) -> str:
        return self.verdicts[pr_url]
