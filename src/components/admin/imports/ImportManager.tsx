import { useState } from 'react';
import { Box, Tabs, TabList, TabPanels, TabPanel, Tab } from '@chakra-ui/react';
import FlightImportTab from './FlightImportTab';
import AccountImportTab from './AccountImportTab';
import MemberImportTab from './MemberImportTab';
import AircraftImportTab from './AircraftImportTab';

const ImportManager = () => {
  return (
    <Box>
      <Box mb={6} p={4} bg="blue.50" color="blue.800" borderRadius="lg">
        <h3 className="font-medium mb-2">Ordre d'import recommandé :</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Appareils</li>
          <li>Membres</li>
          <li>Opérations comptables</li>
          <li>Vols</li>
        </ol>
      </Box>

      <Tabs>
        <TabList>
          <Tab>Avions</Tab>
          <Tab>Membres</Tab>
          <Tab>Comptes</Tab>
          <Tab>Vols</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <AircraftImportTab />
          </TabPanel>
          <TabPanel>
            <MemberImportTab />
          </TabPanel>
          <TabPanel>
            <AccountImportTab />
          </TabPanel>
          <TabPanel>
            <FlightImportTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ImportManager;
