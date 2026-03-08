// Bilingual translations for the public Service Request Form
// Usage: translations[lang].key

const translations = {
    en: {
        // Header
        formTitle: 'Service Request Form',
        formSubtitle: 'Fill out the form below to request a quote for your move or transport service.',

        // Section 1 — Client Info
        sectionClient: 'Client Information',
        fullName: 'Full Name',
        email: 'Email',
        whatsapp: 'WhatsApp',
        whatsappPlaceholder: '+353 ...',
        residentialAddress: 'Residential Address',

        // Address fields
        eircode: 'Eircode',
        eircodePlaceholder: 'XXX XXXX',
        street: 'Street / Road / Avenue',
        houseNumber: 'House Number / Name',
        apartment: 'Apartment / Unit / Floor',
        area: 'Area / District',
        city: 'City / Town',
        county: 'County',

        // Section 2 — Pickup
        sectionPickup: 'Pickup Address',
        sameAsResidential: 'Same as residential address',
        accessType: 'Access type',
        stairs: 'Stairs',
        elevator: 'Elevator',
        floorNumber: 'Floor number',

        // Section 3 — Delivery
        sectionDelivery: 'Delivery Address',

        // Section 4 — Service Type
        sectionService: 'Type of Service',
        houseRemoval: 'House Removal',
        wasteRemoval: 'Waste Removal',
        transport: 'Transport',
        other: 'Other',
        otherPlaceholder: 'Please describe your service needs...',

        // Section 5 — Items
        sectionItems: 'Items',
        itemsQuestion: 'Does your move include furniture?',
        yesFurniture: 'Yes, furniture',
        furnitureExamples: 'Bed, Mattress, Table, Chairs, Sofa, Fridge, Washing Machine, Bicycle',
        noBags: 'No, just bags & boxes',
        bagsExamples: 'Suitcases, Bags, Boxes',

        // Section 6 — Assembly
        sectionAssembly: 'Assembly & Disassembly',
        assemblyQuestion: 'Do you need assembly or disassembly?',
        yes: 'Yes',
        no: 'No',
        assemblyItemsLabel: 'What items need assembly/disassembly?',
        assemblyItemsPlaceholder: 'Describe the items that need assembly or disassembly...',
        assemblyTypeQuestion: 'What type of work is needed?',
        assemblyOnly: 'Assembly only',
        disassemblyOnly: 'Disassembly only',
        both: 'Both',

        // Section 7 — Additional
        sectionAdditional: 'Additional Information',
        parkingQuestion: 'Is there parking space available near the building/house?',
        preferredDate: 'Preferred date',
        preferredTime: 'Preferred time',

        // Actions
        submit: 'Submit Service Request',
        submitting: 'Submitting...',
        successTitle: 'Request Submitted!',
        successMessage: 'Thank you! We received your service request and will contact you shortly.',
        required: 'Required',
        cancel: 'Cancel',
    },

    pt: {
        // Header
        formTitle: 'Formulário de Solicitação de Serviço',
        formSubtitle: 'Preencha o formulário abaixo para solicitar um orçamento para sua mudança ou transporte.',

        // Section 1 — Client Info
        sectionClient: 'Informações do Cliente',
        fullName: 'Nome Completo',
        email: 'E-mail',
        whatsapp: 'WhatsApp',
        whatsappPlaceholder: '+353 ...',
        residentialAddress: 'Endereço Residencial',

        // Address fields
        eircode: 'Eircode',
        eircodePlaceholder: 'XXX XXXX',
        street: 'Rua / Estrada / Avenida',
        houseNumber: 'Número / Nome da Casa',
        apartment: 'Apartamento / Unidade / Andar',
        area: 'Bairro / Distrito',
        city: 'Cidade',
        county: 'Condado',

        // Section 2 — Pickup
        sectionPickup: 'Endereço de Retirada',
        sameAsResidential: 'Mesmo do endereço residencial',
        accessType: 'Tipo de acesso',
        stairs: 'Escada',
        elevator: 'Elevador',
        floorNumber: 'Número do andar',

        // Section 3 — Delivery
        sectionDelivery: 'Endereço de Entrega',

        // Section 4 — Service Type
        sectionService: 'Tipo de Serviço',
        houseRemoval: 'Mudança Residencial',
        wasteRemoval: 'Remoção de Resíduos',
        transport: 'Transporte',
        other: 'Outro',
        otherPlaceholder: 'Descreva suas necessidades de serviço...',

        // Section 5 — Items
        sectionItems: 'Itens',
        itemsQuestion: 'Sua mudança inclui móveis?',
        yesFurniture: 'Sim, móveis',
        furnitureExamples: 'Cama, Colchão, Mesa, Cadeiras, Sofá, Geladeira, Máquina de Lavar, Bicicleta',
        noBags: 'Não, apenas malas e caixas',
        bagsExamples: 'Malas, Sacolas, Caixas',

        // Section 6 — Assembly
        sectionAssembly: 'Montagem e Desmontagem',
        assemblyQuestion: 'Precisa de montagem ou desmontagem?',
        yes: 'Sim',
        no: 'Não',
        assemblyItemsLabel: 'Quais itens precisam de montagem/desmontagem?',
        assemblyItemsPlaceholder: 'Descreva os itens que precisam de montagem ou desmontagem...',
        assemblyTypeQuestion: 'Qual tipo de trabalho é necessário?',
        assemblyOnly: 'Apenas montagem',
        disassemblyOnly: 'Apenas desmontagem',
        both: 'Ambos',

        // Section 7 — Additional
        sectionAdditional: 'Informações Adicionais',
        parkingQuestion: 'Há espaço para estacionar perto do prédio/casa?',
        preferredDate: 'Data preferida',
        preferredTime: 'Horário preferido',

        // Actions
        submit: 'Enviar Solicitação',
        submitting: 'Enviando...',
        successTitle: 'Solicitação Enviada!',
        successMessage: 'Obrigado! Recebemos sua solicitação e entraremos em contato em breve.',
        required: 'Obrigatório',
        cancel: 'Cancelar',
    }
};

export default translations;
