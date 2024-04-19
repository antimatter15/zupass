import { Box, Button, Stack } from "@chakra-ui/react";
import { ReactNode } from "react";
import { PodLink } from "../../components/Core";

export function CreatePipelineButtonSection(): ReactNode {
  return (
    <div>
      <Stack overflow="hidden" gap={4}>
        <Box display="inline-block">
          <Box>
            <PodLink to="/create-pipeline">
              <Button colorScheme="green">Create Pipeline</Button>
            </PodLink>
          </Box>
        </Box>
      </Stack>
    </div>
  );
}
