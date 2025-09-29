import django
import json
import os
import re
import yaml

# Importing settings and setup before loading anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'herbridge.settings')
django.setup()

from datetime import datetime
from django.test import TestCase
from main.api import ArchesAPI


class ArchesAPITestCase(TestCase):
    """
        Test class for unit tests on the ArchesAPI object/functionality
        within api.py for testing connection to the Arches EAMENA instance etc.x
    """

    def test_get_header_tokens(self):
        """
            Tests setting and retrieving of the header auth/tokens/referrer
            from the get_headers function.
        """
        test_api = ArchesAPI()

        # Setting some values on the object
        referrer_value = "refer_test"
        test_api.oauth_token = "oauth"
        test_api.csrf_token = "csrf"
        test_api.eamena_token = "eamena"

        # Request the headers from the function, then extract the relevant data.
        result = test_api.get_headers(referrer=referrer_value, oauth=test_api.oauth_token)
        cookie = result["Cookie"]
        result_csrf = cookie.split("csrftoken=")[1].split(";")[0]
        result_eamena = cookie.split("eamena=")[1].split(";")[0]

        self.assertEquals(result_csrf, test_api.csrf_token)
        self.assertEquals(result_eamena, test_api.eamena_token )
        self.assertEquals(result["Referer"], referrer_value)
        self.assertEquals(result["Authorization"], f"Bearer {test_api.oauth_token}")

    def test_description_payload(self):
        """
            Selects the Report object associated with the given image upload.
        """
        # image_id is from fixture geotagged-photo-hongkong.jpg
        image_id = "e0000000-0000-0000-0000-000000000001"
        # Test text to use
        description_text = "TestText"
        expected_data = {
            "RESOURCE_INFO": {
                "Name": "Castle Dumas",
                "Type": "area",
                "Condition": "", # No condition is set here.
                "HAZARD_INFO": {
                    "Hazards": True,
                    "Safety_Hazards": False,
                    "Intervention_Required": True,
                },
                "Notes": "nice old castle"
            },
            "IMAGE_DESCRIPTION": description_text
        }

        arches_api = ArchesAPI()
        # Emulate selecting and making the payload to string, then pass to function
        desc_payload = json.dumps(arches_api.nodes["DESCRIPTION"]["payload"])
        # Finally, run the test function and get the result items
        desc_result = arches_api.description_payload(image_id, desc_payload, description_text)

        # Testing results for each language value field
        results = [val['value'] for key, val in desc_result.items()]
        for r in results:
            fixed_line = r.replace(" | ", "\n").strip()
            yaml_data = yaml.safe_load(fixed_line)

            # Crude email check
            pattern = r'^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            match_result = re.match(pattern, yaml_data["ASSESSOR"]["Email"])
            self.assertTrue(match_result)

            # Checking that we get a valid datetime
            self.assertEquals(type(yaml_data["CREATED_AT"]), datetime)

            # Ensure assessor field has text within
            self.assertGreater(len(yaml_data["ASSESSOR"]["Email"]), 0)
            self.assertGreater(len(yaml_data["ASSESSOR"]["Name"]), 0)

            # Should match the expected result above
            self.assertEquals(yaml_data["RESOURCE_INFO"], expected_data["RESOURCE_INFO"])
            self.assertEquals(yaml_data["IMAGE_DESCRIPTION"], expected_data["IMAGE_DESCRIPTION"])